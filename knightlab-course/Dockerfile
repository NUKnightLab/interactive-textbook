FROM python:3.12-slim

# system packages. note: libxml2-dev, libcurl4-openssl-dev, libssl-dev are required by R packages
# xml2, curl, openssl are packages that languageserver depends on (also for R)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git curl libgomp1 \
    r-base r-base-dev \
    libxml2-dev libcurl4-openssl-dev libssl-dev libuv1-dev \
    sudo nano less openssh-client ca-certificates procps gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
ARG USERNAME=student
ARG USER_UID=1000
ARG USER_GID=1000
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m -s /bin/bash $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Python dependencies from requirements.txt
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Node dependencies from requirements-node.json
COPY requirements-node.json /tmp/package.json
RUN cd /tmp && npm install -g $(node -e "console.log(Object.keys(require('./package.json').dependencies).join(' '))")

# make globally installed Node packages findable by require() from anywhere
ENV NODE_PATH=/usr/lib/node_modules

# R packages from requirements-r.R, takes the longest
COPY requirements-r.R /tmp/requirements-r.R
RUN Rscript /tmp/requirements-r.R

# course content owned by student
COPY --chown=$USERNAME:$USERNAME datasets/  /home/$USERNAME/datasets/
COPY --chown=$USERNAME:$USERNAME chapters/  /home/$USERNAME/chapters/

# workspace settings do not to show the Welcome page on startup (also from settings file)
COPY --chown=$USERNAME:$USERNAME .vscode/   /home/$USERNAME/.vscode/

USER $USERNAME
WORKDIR /home/$USERNAME

# no long-running service, VS Code Dev Containers attaches via docker exec.
# sleep infinity keeps the container alive doing nothing.
CMD ["sleep", "infinity"]
