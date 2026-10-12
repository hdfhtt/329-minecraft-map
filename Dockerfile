# Render/deploy image for the Azure Container Apps Job. A glibc base is required:
# the MinedMap release binary is x86_64-unknown-linux-gnu (glibc) and will not run
# on Alpine/musl. node:bookworm-slim is Debian (glibc) and provides node + npm for
# the Static Web Apps CLI used by scripts/deploy.sh.
FROM node:20-bookworm-slim

# Tools: az CLI (blob pull + managed-identity login), plus curl/unzip/tar/git.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl unzip tar git ca-certificates python3 \
  && curl -sL https://aka.ms/InstallAzureCLIDeb | bash \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Bake the MinedMap renderer and viewer so runs need no GitHub download. Pinned to
# whatever `nightly` was at build time; rebuild the image to refresh.
ARG MINEDMAP_RELEASE=nightly
RUN base="https://github.com/smol-kitten/MinedMap/releases/download/${MINEDMAP_RELEASE}" \
  && curl -fL "$base/MinedMap--x86_64-unknown-linux-gnu.zip" -o /tmp/minedmap.zip \
  && unzip -o /tmp/minedmap.zip -d /tmp/minedmap \
  && install -m 0755 "$(find /tmp/minedmap -type f -name minedmap -print -quit)" /opt/minedmap \
  && curl -fL "$base/MinedMap--viewer.zip" -o /tmp/viewer.zip \
  && unzip -q /tmp/viewer.zip -d /tmp/viewer \
  && mkdir -p /opt/viewer \
  && cp -a "$(dirname "$(find /tmp/viewer -type f -name index.html -print -quit)")"/. /opt/viewer/ \
  && rm -rf /tmp/minedmap.zip /tmp/minedmap /tmp/viewer.zip /tmp/viewer

WORKDIR /app
COPY . /app
RUN chmod +x scripts/*.sh

ENV STORAGE_ACCOUNT=minecraftwith3298eeb \
    BACKUP_CONTAINER=map-backups \
    MINEDMAP_BIN=/opt/minedmap \
    VIEWER_SRC=/opt/viewer

# Renders the newest (or $BLOB) backup and deploys. SWA_CLI_DEPLOYMENT_TOKEN and
# the overlay URLs are supplied as job secrets/env at runtime.
ENTRYPOINT ["/app/scripts/render-deploy.sh"]
