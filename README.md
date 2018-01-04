## PlexSSO
A better nginx auth_request based SSO using Plex as an authentication provider.

### Dependencies
- Node.JS 7+ (lower has not been tested) + NPM
- Nginx with auth_request

### Installation
1. Run `build.sh` and follow the configuration instructions it provides.
2. Use the examples in the nginx directory to use it as an SSO.

### Notes
- Where possible this SSO does not disable the individual applications authentication, this means that your applications will still be secured even if the SSO is somehow bypassed

### License
MIT License
