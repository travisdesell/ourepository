__author__ = 'Ian Randman'

import logging
import os
import warnings

import numpy as np
import tensorflow as tf
import time
from object_detection.utils import label_map_util
from object_detection.utils import visualization_utils as viz_utils

import matplotlib as mpl
mpl.use('module://backend_interagg')
import matplotlib.pyplot as plt
# matplotlib.use('TkAgg')
# import matplotlib.pyplot as plt

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow logging (1)
tf.get_logger().setLevel('ERROR')  # Suppress TensorFlow logging (2)

# warnings.filterwarnings("ignore", category=mpl)  # Suppress Matplotlib warnings

logger = logging.getLogger(__name__)


def load_from_saved_model(name, model_name):
    # Enable GPU dynamic memory allocation
    gpus = tf.config.experimental.list_physical_devices('GPU')
    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)

    saved_model_path = os.path.join(os.path.dirname(__file__), '../../exported-models', name, model_name, 'saved_model')
    label_map_path = os.path.join(os.path.dirname(__file__), '../../annotations', name, 'label_map.pbtxt')

    logger.info('Loading model...')
    start_time = time.time()

    # Load saved model and build the detection function
    detect_fn = tf.saved_model.load(saved_model_path)

    end_time = time.time()
    elapsed_time = end_time - start_time
    logger.info('Done! Took {} seconds'.format(elapsed_time))

    # load label map data (for plotting)
    category_index = label_map_util.create_category_index_from_labelmap(label_map_path,
                                                                        use_display_name=True)

    return detect_fn, category_index


def inference(image, detect_fn, category_index):
    image = image.convert('RGB')
    image_np = np.array(image)

    # Things to try:
    # Flip horizontally
    # image_np = np.fliplr(image_np).copy()

    # Convert image to grayscale
    # image_np = np.tile(
    #     np.mean(image_np, 2, keepdims=True), (1, 1, 3)).astype(np.uint8)

    # The input needs to be a tensor, convert it using `tf.convert_to_tensor`.
    input_tensor = tf.convert_to_tensor(image_np)
    # The model expects a batch of images, so add an axis with `tf.newaxis`.
    input_tensor = input_tensor[tf.newaxis, ...]

    detections = detect_fn(input_tensor)

    # All outputs are batches tensors.
    # Convert to numpy arrays, and take index [0] to remove the batch dimension.
    # We're only interested in the first num_detections.
    num_detections = int(detections.pop('num_detections'))
    detections = {key: value[0, :num_detections].numpy()
                  for key, value in detections.items()}
    detections['num_detections'] = num_detections

    # detection_classes should be ints.
    detections['detection_classes'] = detections['detection_classes'].astype(np.int64)

    image_np_with_detections = image_np.copy()

    viz_utils.visualize_boxes_and_labels_on_image_array(
        image_np_with_detections,
        detections['detection_boxes'],
        detections['detection_classes'],
        detections['detection_scores'],
        category_index,
        use_normalized_coordinates=True,
        max_boxes_to_draw=40,
        min_score_thresh=.30,
        agnostic_mode=False)

    plt.figure()
    plt.imshow(image_np_with_detections)

    plt.show()
