# Chatbot Starter Project

A Next.js starter project that validates all API integrations and establishes a solid CI/CD foundation for a knowledge base and chatbot management system.

## 🎯 Project Overview

This starter project is designed to:
- Test all required API integrations before development
- Establish CI/CD pipeline for efficient development
- Provide a foundation ready for heavy modification and scaling
- Support Thai/English localization for the Thailand market

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Authentication**: Neon Auth (Stack Auth)
- **Database**: Neon PostgreSQL with vector support
- **AWS Services**: Bedrock (Titan embeddings), S3, Lambda, API Gateway
- **OCR Services**: Mistral OCR, LlamaIndex
- **Deployment**: AWS Amplify
- **CI/CD**: GitHub Actions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your actual credentials
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) to see the API test dashboard.

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Neon Auth (Stack Auth)
NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
STACK_SECRET_SERVER_KEY=your_secret_key

# Database
DATABASE_URL=your_neon_postgresql_url

# AWS (BAWS prefix required for Amplify)
BAWS_ACCESS_KEY_ID=your_aws_access_key
BAWS_SECRET_ACCESS_KEY=your_aws_secret_key
DEFAULT_REGION=ap-southeast-1
BEDROCK_REGION=us-east-1

# Third-party APIs
MISTRAL_API_KEY=your_mistral_api_key
LLAMAINDEX_API_KEY=your_llamaindex_api_key
```

## 📊 API Testing

The project includes a comprehensive API testing dashboard that validates:

- **Neon PostgreSQL**: Database connection and table operations
- **Neon Auth**: Authentication system configuration
- **AWS Bedrock**: Titan embeddings generation
- **AWS S3**: File upload capabilities
- **Mistral OCR**: Document processing
- **LlamaIndex**: Alternative OCR processing

### Running Tests

- **All tests**: Visit `/` and click "Run All Tests"
- **Individual tests**: Use the individual service buttons
- **CI/CD tests**: `npm run test:api`

## 🏗️ Project Structure

```
chatbot/
├── app/
│   ├── api/                    # API routes
│   │   ├── test-*/            # Service test endpoints
│   │   └── test-all/          # Comprehensive test runner
│   ├── components/            # React components
│   ├── handler/               # Stack Auth handlers
│   └── page.tsx              # Main dashboard
├── lib/                       # Utility libraries
│   ├── config.ts             # Environment validation
│   ├── neon.ts               # Database connections
│   └── aws.ts                # AWS service clients
├── scripts/                   # Build and test scripts
├── docs/                      # Generated documentation
└── .github/workflows/         # CI/CD configuration
```

## 🚀 Deployment

### AWS Amplify

1. Connect your GitHub repository to AWS Amplify
2. Configure environment variables in Amplify console
3. Use the provided `amplify.yml` build configuration
4. Deploy automatically on push to `main` branch

### Environment Variables for Amplify

Set these in the Amplify console:

```
NEXT_PUBLIC_STACK_PROJECT_ID
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
STACK_SECRET_SERVER_KEY
DATABASE_URL
BAWS_ACCESS_KEY_ID
BAWS_SECRET_ACCESS_KEY
DEFAULT_REGION
BEDROCK_REGION
MISTRAL_API_KEY
LLAMAINDEX_API_KEY
```

## 🔄 CI/CD Pipeline

The GitHub Actions workflow includes:

1. **Code Quality**: Linting and type checking
2. **Build Test**: Ensure the project builds successfully
3. **API Integration Tests**: Validate all service connections
4. **Automatic Deployment**: Deploy to Amplify on successful tests

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler
- `npm run test:api` - Test API endpoints
- `npm run setup-env` - Validate environment setup

## 🎯 Next Steps

Once all API tests pass:

1. **Add Shadcn/ui components** for enhanced UI
2. **Implement multi-language support** (Thai/English)
3. **Build chatbot management features**
4. **Add document processing pipeline**
5. **Implement RAG functionality with Langchain**
6. **Add Sentry for error tracking**

## 🐛 Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure all required vars are set
2. **AWS Permissions**: Verify IAM permissions for Bedrock and S3
3. **Database Connection**: Check Neon PostgreSQL connection string
4. **API Keys**: Validate third-party API keys are active

### Getting Help

1. Check the API test dashboard for specific error messages
2. Review the generated test report in `docs/api-test-results.md`
3. Check GitHub Actions logs for CI/CD issues

## 📄 License

This project is licensed under the MIT License.