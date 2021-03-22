import logging
import os

logging.basicConfig(
    format='%(asctime)s %(filename)s %(levelname)-8s %(message)s',
    level=logging.INFO,
    datefmt='%Y-%m-%d %H:%M:%S')

logging.getLogger().setLevel(logging.INFO)

# the root directory where all output should go
ROOT_DIR = os.path.join(os.path.dirname(__file__), '..')
