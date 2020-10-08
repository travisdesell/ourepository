from PIL import Image
import rasterio as rio
import numpy as np
from matplotlib import pyplot
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../data')
CARIBOU_DIR = os.path.join(DATA_DIR, 'caribou')

caribou_file_name = os.path.join(CARIBOU_DIR, '20160718_camp_gm_03_120m_transparent_mosaic_group1.tif')

## Training Specs
input_height = 254
input_width = 254

## load in tif mosaic
# mosaic_dataset = rio.open(r"D:\Linux Laptop\Classes\Senior Project\car.tif")
mosaic_dataset = rio.open(caribou_file_name)

## display attrs
print("Number of bands:")
print(mosaic_dataset.count)

print("Width and height:")
width = mosaic_dataset.width
height = mosaic_dataset.height
print(width)
print(height)

print("Band properties:")
print({i: dtype for i, dtype in zip(mosaic_dataset.indexes, mosaic_dataset.dtypes)})

# view image (bands)
print("Reading Mosaic Data")
for i in range(1,mosaic_dataset.count + 1):
    array = None
    array = mosaic_dataset.read(i)
    pyplot.imshow(array)
    pyplot.show()

## crop mosaic loop

x_iter = round(width / input_width)
y_iter = round(height / input_height)
start_x = 0
start_y = 0
end_x = input_width
end_y = input_height

for i in range(x_iter):
    for j in range(y_iter):

        # crop
        sample = mosaic_dataset.crop(start_x, start_y, end_x, end_y)

        # annotate

        # save
        sample.save(str(i) + str(j) + ".tif")

        # iterate
        start_x += input_width 
        end_x += input_width
        start_y += input_height
        end_y += input_height
