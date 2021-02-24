import os
import pathlib
import tensorflow as tf
import time
from object_detection.utils import label_map_util
from object_detection.utils import visualization_utils as viz_utils

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow logging (1)
tf.get_logger().setLevel('ERROR')  # Suppress TensorFlow logging (2)

def load_from_checkpoint():
    import time
    from object_detection.utils import label_map_util
    from object_detection.utils import config_util
    from object_detection.utils import visualization_utils as viz_utils
    from object_detection.builders import model_builder

    PATH_TO_MODEL_DIR = '../../exported-models/test/my_faster_rcnn_resnet50_v1'
    PATH_TO_LABELS = '../../annotations/test/label_map.pbtxt'

    PATH_TO_CFG = PATH_TO_MODEL_DIR + "/pipeline.config"
    PATH_TO_CKPT = PATH_TO_MODEL_DIR + "/checkpoint"

    logger.info('Loading model... ', end='')
    start_time = time.time()

    # Load pipeline config and build a detection model
    configs = config_util.get_configs_from_pipeline_file(PATH_TO_CFG)
    model_config = configs['model']
    detection_model = model_builder.build(model_config=model_config, is_training=False)

    # Restore checkpoint
    ckpt = tf.compat.v2.train.Checkpoint(model=detection_model)
    ckpt.restore(os.path.join(PATH_TO_CKPT, 'ckpt-0')).expect_partial()


    @tf.function
    def detect_fn(image):
        """Detect objects in image."""

        image, shapes = detection_model.preprocess(image)
        prediction_dict = detection_model.predict(image, shapes)
        detections = detection_model.postprocess(prediction_dict, shapes)

        return detections

    end_time = time.time()
    elapsed_time = end_time - start_time
    logger.info('Done! Took {} seconds'.format(elapsed_time))

    # load label map data (for plotting)
    category_index = label_map_util.create_category_index_from_labelmap(PATH_TO_LABELS,
                                                                        use_display_name=True)

    return detect_fn, category_index


def load_from_saved_model():
    # Enable GPU dynamic memory allocation
    gpus = tf.config.experimental.list_physical_devices('GPU')
    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)

    PATH_TO_SAVED_MODEL = '../../exported-models/test/my_faster_rcnn_resnet50_v1/saved_model'
    PATH_TO_LABELS = '../../annotations/test/label_map.pbtxt'

    logger.info('Loading model...', end='')
    start_time = time.time()

    # Load saved model and build the detection function
    detect_fn = tf.saved_model.load(PATH_TO_SAVED_MODEL)

    end_time = time.time()
    elapsed_time = end_time - start_time
    logger.info('Done! Took {} seconds'.format(elapsed_time))

    # load label map data (for plotting)
    category_index = label_map_util.create_category_index_from_labelmap(PATH_TO_LABELS,
                                                                        use_display_name=True)

    return detect_fn, category_index


import numpy as np
from PIL import Image, ImageDraw

import matplotlib as mpl
mpl.use('module://backend_interagg')
import matplotlib.pyplot as plt
# import matplotlib
#
# matplotlib.use('TkAgg')
# import matplotlib.pyplot as plt
import warnings

warnings.filterwarnings('ignore')  # Suppress Matplotlib warnings


# def load_image_into_numpy_array(path):
#     """Load an image from file into a numpy array.
#
#     Puts image into numpy array to feed into tensorflow graph.
#     Note that by convention we put it into a numpy array with shape
#     (height, width, channels), where channels=3 for RGB.
#
#     Args:
#       path: the file path to the image
#
#     Returns:
#       uint8 numpy array with shape (img_height, img_width, 3)
#     """
#     return np.array(Image.open(path))

def inference(image, detect_fn, category_index, overlay_data):
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

    # input_tensor = tf.convert_to_tensor(np.expand_dims(image_np, 0), dtype=tf.float32)

    # input_tensor = np.expand_dims(image_np, 0)
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

    #####################
    # create image
    image = Image.fromarray(image_np_with_detections, mode='RGB')
    image = image.convert('RGBA')

    # annotate image
    overlay = Image.new('RGBA', image_np_with_detections.shape[:-1], (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)  # create Draw object

    annotations, x, y = overlay_data

    # iterate over all annotations in slice
    for x1, y1, x2, y2 in annotations:
        # calculate relative coordinates for annotation in slice
        rel_x1 = x1 - x
        rel_y1 = y1 - y
        rel_x2 = x2 - x
        rel_y2 = y2 - y

        # draw rectangle to represent annotation
        draw.rectangle((rel_x1, rel_y1, rel_x2, rel_y2), fill=(255, 0, 0, 50),
                       outline=(255, 255, 255))  # add annotations

    # save relative coordinates to file
    # writer.writerow([rel_x1, rel_y1, rel_x2, rel_y2])  # write relative bounds to file

    # Uncomment next line to add annotation overlay to image.
    image = Image.alpha_composite(image, overlay)
    image = image.convert('RGB')

    image_np_with_detections = np.array(image)
    #####################

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
