from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from schema import ParamedicForm
from tools import ParamedicAgentTools
from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver as MemorySaver
from dotenv import load_dotenv
from prompts import Prompts
import os

# IMPORTANT: Best practices for handling API keys securely in Python
# 
# While hardcoding your API key directly into the code might seem fine for learning or quick prototypes, 
# it’s **not recommended for production environments** or shared codebases, as it exposes your sensitive credentials.
#
# Here’s how you can securely store and use your API key in your project:
#
# 1. **Use Environment Variables**:
#    - Store your API key in an environment variable to avoid hardcoding it into your source code.
#    - On Windows 11, you can set environment variables as follows:
#      1. Open **Start Menu**, type `Environment Variables`, and select **Edit the system environment variables**.
#      2. Under **System Properties**, click **Environment Variables**.
#      3. Under **User variables**, click **New...** and add a new variable with:
#         - Name: `GEMINI_API_KEY` (or whatever name you prefer).
#         - Value: Your actual API key.
#
# 2. **Access the API key in Python**:
#    - Use the `os` module in Python to retrieve the environment variable securely:
#
#    ```python
#    import os
#    api_key = os.getenv('GEMINI_API_KEY')  # 'GEMINI_API_KEY' is the environment variable name you set above
#    if not api_key:
#        raise ValueError("API key not set. Please set the GEMINI_API_KEY environment variable.")
#    ```
#
# 3. **Use `.env` files for local development**:
#    - Install `python-dotenv` to manage environment variables in a `.env` file.
#      - Run `pip install python-dotenv` in your VSCode terminal.
#    - Create a `.env` file in the root directory of your project:
#      ```
#      GEMINI_API_KEY=your_api_key_here
#      ```
#    - Then, in your Python code, load the `.env` file like this:
#    ```python
#    from dotenv import load_dotenv
#    load_dotenv()  # This loads environment variables from the .env file
#    api_key = os.getenv('GEMINI_API_KEY')
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
# By following these practices, you can help protect your API keys from exposure, reduce security risks, and make your code more portable and reusable across environments.
#
# Happy coding! 🚀

# 1. Initialize the LLM


class ParamedicAgent:
    def __init__(self, tools, model_name="google/gemini-flash-1.5-8b".strip()):
        load_dotenv()  # This loads environment variables from the .env file
        api_key = os.getenv('OPENROUTER_API_KEY')  # 'GEMINI_API_KEY' is the environment variable name you set above
        if not api_key:
            raise ValueError("API key not set. Please set the OPENROUTER_API_KEY environment variable.")
      
        base_llm = ChatOpenAI(
            model=model_name,
              api_key=api_key,
              openai_api_base="https://openrouter.ai/api/v1".strip(),
            default_headers={
                "HTTP-Referer": "http://localhost:3000".strip(), # Required by OpenRouter
                "X-Title": "WIMTACH Paramedic Assistant".strip()
            } ,
              temperature=0)
        
        self.llm = base_llm.with_structured_output(ParamedicForm)

        # self.llm_with_tools = self.llm.bind_tools(tools)
        self.tools = tools
        self.system_prompt = Prompts.get_prompt()
        self.checkpointer = MemorySaver()
        self.agent = self.get_agent()

    def get_agent(self):
        return create_agent(model=self.llm, tools=self.tools,
        system_prompt=self.system_prompt, checkpointer=self.checkpointer)

    def ask(self, query: str, thread_id: str):
        """Helper method to simplify calling the agent"""
        messages = [
        ("system", self.system_prompt),
        ("user", query)
    ]

        result = self.llm.invoke(messages)
     
        return result.model_dump_json()
    
# if __name__ == "__main__":
#     toolsArray = [
#         ParamedicAgentTools.log_teddy_bear_gift, 
#         ParamedicAgentTools.update_vehicle_inventory, 
#         ParamedicAgentTools.log_incident_detail]
#     # str_prompt = "You are a WIMTACH Emergency Dispatch Agent at Centennial College. Your goal is to support decision-making by analyzing vitals and checking hospital capacity. If vitals are CRITICAL " \
#     # "and the ICU is full, suggest diverting to the nearest partner hospital."
  
#     agent_instance = ParamedicAgent(toolsArray)
#     query = "We have a patient with Heart Rate 110 and SpO2 85. Can we take them to the ICU?"
#     print(agent_instance.ask(query, thread_id="patient_123"))  # Print the agent's final response