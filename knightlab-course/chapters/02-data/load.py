# Chapter 2
# Loads the Titanic dataset from the course datasets folder
# and prints a few summary stats.

import pandas as pd

# read_csv reads a csv file into a DataFrame.
df = pd.read_csv("/home/student/datasets/titanic.csv")

# First 5 rows
print(df.head())

print()
print("Number of passengers:", len(df))
