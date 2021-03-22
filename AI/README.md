# Machine Learning Documentation for OURepository

## Prerequisites

Run `pip install requirements.txt`.

Install [TensorFlow Object Detection API](https://tensorflow-object-detection-api-tutorial.readthedocs.io/en/latest/install.html#tensorflow-object-detection-api-installation).

In `scripts/__init__.py`, reconfigure the root directory for all output if desired.

## Preliminary steps for training and inference:

All the following commands should be run from the AI directory.

1. Run `python test/generate_test_img.py` to generate the test dataset.
1. Run `python scripts/preprocessing/crop.py` to generate image slices and convert to TFRecords.
1. Run `python scripts/model_main_tf2.py` to start the training process.
1. From the command line, run `tensorboard --logdir=models/$name/$model_name` to view training statistics. 
   For example, `tensorboard --logdir=models/test/faster_rcnn_resnet50_v1_640x640_coco17_tpu-8`. It may take a bit 
   of time for statistics to become available. Training can be stopped when loss reaches an asymptote. Early 
   stopping needs to be implemented, or num_steps must be defined.
1. Run `python scripts/exporter_main_v2.py` to export the model.
1. Evaluation can be performed using either a Tensorflow SavedModel or a Checkpoint. We will use SavedModel. Run 
   `python scripts/evaluation/inference.py`. This currently outputs a plot for the inference of each slice. Set a 
   breakpoint on line 43 to see the inference for each slice. This will be changed to output a single image with all 
   predicted annotations overlaid on top. The current configuration of matplotlib may cause issues if run from the 
   command line.
   
Please look at the referenced files for more details on program arguments. By default, it will run on a test dataset.

## Outputted files

All output is organized on the highest level by a unique name that identifies the mosaic the model was trained on. 
For a given mosaic, different types of models can be trained. So all paths start with the name (if applicable), then 
the model name (if applicable), and finally files specific to the action.

The `annotations` directory contains the label map and TFRecords for each mosaic.  
The `pre-trained-models` directory contains all downloaded models (unpacked) and an `archives` directory with the 
tar.gz of each downloaded model.  
The `models` directory contains the model data for user-trained models, organized by name then model name.  
The `exported-models` directory contains the user-trained models that have been exported, organized by name, then model 
name.  
The `inferences` directory contains all inferences performed by a model. Each inference makes a new directory from the 
image name that contains the image with detection on top, and a CSV for the bounding boxes for each label the model 
was trained on. Organization is by name, then model name, then image name.

## Troubleshooting

Issues may arise related to HDF5 if rasterio is imported before Tensorflow. Take note importing files that import 
either of these packages.