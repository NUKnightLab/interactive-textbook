FROM python:3.12-slim

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git curl libgomp1 \
    sudo nano less openssh-client ca-certificates procps \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for Dev Containers best practices
ARG USERNAME=student
ARG USER_UID=1000
ARG USER_GID=1000
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m -s /bin/bash $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Python dependencies installed
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Course content owned by the student user
COPY --chown=$USERNAME:$USERNAME datasets/   /home/$USERNAME/datasets/
COPY --chown=$USERNAME:$USERNAME notebooks/  /home/$USERNAME/notebooks/

# Jupyter config under the student user (secondary browser workflow still works)
RUN mkdir -p /home/$USERNAME/.jupyter
COPY --chown=$USERNAME:$USERNAME jupyter_server_config.py /home/$USERNAME/.jupyter/jupyter_server_config.py

USER $USERNAME
WORKDIR /home/$USERNAME

EXPOSE 8888

CMD ["jupyter", "lab"]
