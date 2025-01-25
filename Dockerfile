FROM ubuntu:20.04

RUN apt-get update && apt-get install -y lynx

WORKDIR /root

CMD ["/bin/bash"]

