FROM nginx:1.27-alpine

LABEL maintainer="OpenCloud GmbH <info@opencloud.eu>" \
  org.opencontainers.image.title="OpenCloud Web" \
  org.opencontainers.image.vendor="OpenCloud GmbH" \
  org.opencontainers.image.authors="OpenCloud GmbH" \
  org.opencontainers.image.description="OpenCloud Web - User interface for OpenCloud" \
  org.opencontainers.image.licenses="AGPL-3.0" \
  org.opencontainers.image.documentation="https://github.com/opencloud-eu/web" \
  org.opencontainers.image.url="https://hub.docker.com/r/opencloud-eu/web" \
  org.opencontainers.image.source="https://github.com/opencloud-eu/web"

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/*

ADD docker/overlay /
ADD dist/ /usr/share/nginx/html

EXPOSE 8080

USER nginx

STOPSIGNAL SIGTERM

CMD ["nginx", "-g", "daemon off;"]
WORKDIR /usr/share/nginx/html
