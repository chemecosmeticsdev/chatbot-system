# ⚠️ CREDENTIALS LOCATION

## For Development Team

The real environment variables and credentials for this project are located in:

1. **Local Development**: `credentials.txt` file (excluded from Git)
2. **Documentation**: `documentations.txt` file (excluded from Git)

## Deployment Instructions

When deploying to AWS Amplify:

1. Refer to the `credentials.txt` file for actual values
2. Copy the real values to AWS Amplify environment variables
3. **DO NOT** use the placeholder values in the documentation files
4. The documentation files contain `your_*` placeholders for security

## File Locations

- **Real credentials**: `credentials.txt` (Git ignored)
- **API documentation**: `documentations.txt` (Git ignored)
- **Environment template**: `.env.local.example` (if created)

## Security Notes

- ✅ All documentation files use placeholder values
- ✅ Real credentials are Git ignored
- ✅ Safe for public repository
- ⚠️ Always use real values from `credentials.txt` for deployment

---

*This note ensures the development team knows where to find real credentials while keeping the repository secure.*