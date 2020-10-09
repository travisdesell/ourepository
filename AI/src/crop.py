from PIL import Image
import rasterio as rio
from rasterio.windows import Window
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
#mosaic_dataset = rio.open(r"/media/john/DATA/Classes/SeniorProject/caribou/caribou/20160718_camp_gm_02_75m_transparent_mosaic_group1.tif")
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
# print("Reading Mosaic Data")
# for i in range(1,mosaic_dataset.count + 1):
#    array = mosaic_dataset.read(i)
#    pyplot.imshow(array)
#    pyplot.show()
#    break

# view transform
print("Mosaic Transform:")
print(mosaic_dataset.transform)

# view bounds
print("Mosaic Bounds")
print(mosaic_dataset.bounds)

# view Coordinate Reference System
print("Mosaic CRS:")
print(mosaic_dataset.crs)


## crop mosaic loop
#(0,0) is upper left corner of mosaic img

x_iter = round(width / input_width)
y_iter = round(height / input_height)
offset_x = 0

for i in range(x_iter):
    offset_y = 0
    for j in range(y_iter):

        # check bounds
        print()
        print(i)
        print(j)
        print(offset_x)
        print(offset_y)
        if offset_x + input_width > width or offset_y + input_height > height:
            continue

        # read band slices using Window views
        sample_red = mosaic_dataset.read(1, window=Window(offset_x, offset_y, input_width, input_height))
        sample_green = mosaic_dataset.read(2, window=Window(offset_x, offset_y, input_width, input_height))
        sample_blue = mosaic_dataset.read(3, window=Window(offset_x, offset_y, input_width, input_height))
        sample_alpha = mosaic_dataset.read(4, window=Window(offset_x, offset_y, input_width, input_height))

        # add new axis for RGBA values
        sample_red = sample_red[:,:,np.newaxis]
        sample_green = sample_green[:,:,np.newaxis]
        sample_blue = sample_blue[:,:,np.newaxis]
        sample_alpha = sample_alpha[:,:,np.newaxis]
        
        # concatenate bands along new RGBA axis
        sample = np.concatenate([sample_red, sample_green, sample_blue, sample_alpha], axis=2)

        # # plot img
        # pyplot.imshow(sample)
        # pyplot.show()
        
        # annotate

        # save
        img = Image.fromarray(sample, mode='RGBA')
        img.save(r"/media/john/DATA/Classes/SeniorProject/caribou/caribou/sample" + str(i) + "_" + str(j) + ".png")

        # iterate
        offset_y += input_height
    
    # iterate
    offset_x += input_width 
