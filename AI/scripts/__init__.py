import logging

logging.basicConfig(
    format='%(asctime)s %(filename)s %(levelname)-8s %(message)s',
    level=logging.INFO,
    datefmt='%Y-%m-%d %H:%M:%S')

logging.getLogger().setLevel(logging.INFO)
