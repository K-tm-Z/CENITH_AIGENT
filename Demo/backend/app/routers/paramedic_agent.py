from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
# from schema import ParamedicForm
from .tools import ParamedicAgentTools
from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver as MemorySaver
from dotenv import load_dotenv
from .prompts import Prompts
from datetime import datetime
from typing import Union
from .schema import TeddyBearForm, OcurrenceReport, ParamedicResponse, ParamedicCheckList
from ..config import settings
import os

# IMPORTANT: Best practices for handling API keys securely in Python
# 
# Here’s how you can securely store and use your API key in your project:
#
# 1. **Use Environment Variables**:
#    - Store your API key in an environment variable to avoid hardcoding it into your source code.
#    - On Windows 11, you can set environment variables as follows:
#      1. Open **Start Menu**, type `Environment Variables`, and select **Edit the system environment variables**.
#      2. Under **System Properties**, click **Environment Variables**.
#      3. Under **User variables**, click **New...** and add a new variable with:
#         - Name: `OPENROUTER_API_KEY` (or whatever name you prefer).
#         - Value: Your actual API key.
#
# 2. **Access the API key in Python**:
#    - Use the `os` module in Python to retrieve the environment variable securely:
#
#    ```python
#    import os
#    api_key = os.getenv('OPENROUTER_API_KEY')  # 'OPENROUTER_API_KEY' is the environment variable name you set above
#    if not api_key:
#        raise ValueError("API key not set. Please set the OPENROUTER_API_KEY environment variable.")
#    ```
#
# 3. **Use `.env` files for local development**:
#    - Install `python-dotenv` to manage environment variables in a `.env` file.
#      - Run `pip install python-dotenv` in your VSCode terminal.
#    - Create a `.env` file in the root directory of your project:
#      ```
#      OPENROUTER_API_KEY=your_api_key_here
#      ```
#    - Then, in your Python code, load the `.env` file like this:
#    ```python
#    from dotenv import load_dotenv
#    load_dotenv()  # This loads environment variables from the .env file
#    api_key = os.getenv('OPENROUTER_API_KEY')
#    ```
#
# 4. **Never commit your keys to version control**:
#    - Ensure that you **do not** accidentally commit your `.env` file or code with hardcoded keys to version control (e.g., GitHub).
#    - Add `.env` to your `.gitignore` file to prevent it from being tracked:
#      ```
#      .env
#      ```
#
# 5. **Use key management systems (optional for advanced setups)**:
#    - For more complex applications, you may want to look into key management services such as **AWS Secrets Manager**, **Azure Key Vault**, or **Google Cloud Secret Manager**.
#
class ParamedicAgent:
    def __init__(self, tools,api_key: str = None,model_name="google/gemini-2.0-flash-001"):
        load_dotenv()              
        
        # Use the passed api_key if provided, otherwise check environment
        self.api_key = api_key or os.getenv('OPENROUTER_API_KEY')
        # self.api_key = settings.OPENROUTER_API_KEY
        if not self.api_key:
            raise ValueError("API key not set in environment or passed to constructor.")
      
        # 1. Initialize the Base Model
        self.base_llm = ChatOpenAI(
            model=model_name.strip(), # Note: Use 'model', not 'model_name' for this class
            api_key=self.api_key,
            openai_api_base="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "WIMTACH Paramedic Assistant"
            },
            temperature=0
        )

        self.structured_llm = self.base_llm.with_structured_output(ParamedicResponse)
        self.tools = tools
        self.system_prompt = Prompts.get_prompt()
        self.checkpointer = MemorySaver()
        

        self.agent = self.get_agent()

    def get_agent(self):
        # The agent needs the base_llm to handle tools and conversation
        return create_agent(
            model=self.base_llm, 
            tools=self.tools,
            system_prompt=self.system_prompt, 
            checkpointer=self.checkpointer
        )

    def clear_memory(self, thread_id: str):
        """
        Manually clears the conversation history for a specific thread
        without changing the ID.
        """
        config = {"configurable": {"thread_id": thread_id}}
        
        # We update the state with an empty list of messages.
        # In LangGraph, passing an empty list to the 'messages' key 
        # effectively resets the conversation for that thread.
        self.agent.update_state(
            config,
            {"messages": []}, # Overwrite with empty history
            as_node="__start__" # Tells LangGraph to treat this as a fresh start
        )
        return f"Memory for thread {thread_id} has been cleared."

    def ask(self, query: str, thread_id: str):
        config = {"configurable": {"thread_id": thread_id}}
        
        # 1. Prepare context (Time/Date)
        now = datetime.now()
        # current_dt = now.strftime('%Y-%m-%d %H:%M')
        context_instruction = (
            f"CRITICAL: The current reference time is {now.strftime('%H:%M')} "
            f"on {now.strftime('%Y-%m-%d')}. All relative mentions like 'ten minutes ago' "
            "must be calculated from THIS specific timestamp."
        )
        # 2. Retrieve existing memory from the checkpointer
        state = self.agent.get_state(config)
        # If messages exist in the state, use them; otherwise, start fresh
        messages = state.values.get("messages", []) if state.values else []
        
        # 3. Build the full conversation chain for the LLM
        # We include the System Prompt + History + Current Query
        full_query = [
            ("system", self.system_prompt + "\n\n" + context_instruction)
        ]
        full_query.extend(messages) # Add history
        full_query.append(("user", query)) # Add new input

        # 4. Invoke the structured model
        result = self.structured_llm.invoke(full_query)
        
        # 5. SAVE the turn back to the checkpointer
        # This is crucial so Phase 3 remembers Phase 2
        self.agent.update_state(
            config,
            {"messages": [("user", query), ("assistant", result.model_dump_json())]}
        )
        return result.model_dump_json()