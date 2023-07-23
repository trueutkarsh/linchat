# Linchat

## Dependencies
This version of application has been built and tested with this branch tree https://github.com/trueutkarsh/linera-protocol/tree/service_all_chains

Web frintend dependencies are in "web-frontend/linchat/package.json"

## How to run
- Export environment variables LINERA_WALLET and LINERA_STORAGE
- start valiadators and create chain configuration through scrips/run_local.sh in linera-protocol
- publish the application on default chain with init argument "admin" 
```bash
linera project publish-and-create --json-argument "\"admin\""
```
- Start the service
```bash
linera service
```
