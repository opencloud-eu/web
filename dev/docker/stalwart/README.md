# Stalwart in the Web Development Environment

## Performing Configuration Changes

Configuration changes can be made by pointing a browser to <https://stalwart.opencloud.test/admin/> and authenticating as `admin` with the password `secret`

After changes have been made there, the configuration database needs to be dumped into the NJSON file `./idmldap.json`

To do so, one needs to have [`stalwart-cli`](https://github.com/stalwartlabs/clii#install) installed locally on the host, and then run this:

```bash
./stalwart-snapshot --quiet | ./stalwart-snapshot-passwords > ./idmldap.json
```
