# Stalwart in the Web Development Environment

## Performing Configuration Changes

Configuration changes can be made by pointing a browser to <https://stalwart.opencloud.test/admin/> and authenticating as `admin` with the password `secret`

After changes have been made there, the configuration database needs to be dumped into the NDJSON file `./idmldap.json`

To do so, one needs to have [`stalwart-cli`](https://github.com/stalwartlabs/cli#install) 2.0 or later installed locally on the host, and then run this:

```bash
./stalwart-snapshot --quiet | ./stalwart-snapshot-passwords > ./idmldap.json
```

Stalwart creates an account for each LDAP user on their first login, those accounts must be removed from `./idmldap.json` before committing it.

## Upgrading from Stalwart 0.16

Stalwart 1.x uses a new database layout and can't start on the data of Stalwart 0.16, so it uses the new volume `stalwart-data-v1` and gets initialized from `./idmldap.json` on the first start. The old volume is not used anymore and can be removed:

```bash
docker compose down stalwart stalwart-import
docker volume rm web_stalwart-data
```
