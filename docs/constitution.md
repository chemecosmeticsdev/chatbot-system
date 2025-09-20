. I'm developing a knowledge base and chatbot management system. The system supports Thai (primary) and English as customers are mainly in Thailand. It is a Next.js project relying heavily on Shadcn/ui components. The vector database will be Neon. It should be optimized to be deployed on AWS amplify. A github repo will be setup to do CI/CD development. Sentry will be used for error tracking. 
Tech Stack:
- Shadcn/ui - for frontend components
- Neon auth- for authentication
- Neon Postgresql - for vector database as well as other backend relational database
- Serverless Backend - AWS Lambda function and API gateway
- S3 for uploaded documents storage
- Mistral OCR and LlamaIndex OCR - for documents OCR - can be selected by Admin
- Embedding model - TBD preferably cost-effective multi-lingual model on AWS Bedrock (Amazon Titan Text Embeddings v2)
- ORM for Neon postgresql is optional (ease of use over performance)
- Langchain - for RAG / chatbot framework
Design:
- Professional responsive design with desktop first consideration, follow best practices
- Popular color scheme with gradient
- Dashboard with sidebar on the left
- toggle light/dark mode
- Thai and US English locales support
- Use shadcn/ui MCP, always refer to official documents

Chunking:
- Smart chunking -  LLM powered chunking (preferably AWS Nova Lite or cheaper)

RAG:
- LLM - can be selected for each chatbot instance based on available model in AWS Bedrock us-east-1

Must:
- Strictly follow best practices for design, development and testing
- Always refer to official documents for APIs, Components and Integrations. Use context7 mcp where applicable
- Isolate API testing before integrate into pages/components
- Use Playwright or Pupeteer MCP for layout related tasks for visual feedback
- Always implement error handling for API callings
- Utilize Github issues, logs and PRs to improve productivity
