import openai
from dotenv import load_dotenv
import os

# Load API key from .env file
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY", "sk-proj-3Za9aDepl1mUp1ASXw4d56eBXOMWpyEGpZO6lnwVSTQdwgokrbkrprUg_YkOfJ_WT1Ovowi0dpT3BlbkFJm_CcWV5o1JjsGKBZ5L34On7y9fIL-")

# Initialize OpenAI client
client = openai.OpenAI(api_key=api_key)

# Make a simple API call
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": """Can you explain what makes the importance sampling methods in ESTIMATING THE PROBABILITIES OF RARE OUTPUTS
IN LANGUAGE MODELS
Gabriel Wu∗ Jacob Hilton
Alignment Research Center so special?"""}]
)

print(response)