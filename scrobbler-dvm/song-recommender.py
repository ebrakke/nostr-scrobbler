import pandas as pd
from sklearn.preprocessing import LabelEncoder
import numpy as np
import sqlite3

def load_data_from_sqlite(db_path):
    conn = sqlite3.connect(db_path)
    query = "SELECT * FROM songs;"
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

# Path to your SQLite database
db_path = '/home/erik/Desktop/track_metadata.db'

# Load data from SQLite
dataset = load_data_from_sqlite(db_path)
print(dataset.head())
print(dataset.shape)
print(dataset.columns)

# Drop duplicates
dataset.drop_duplicates(inplace=True)

# Handle missing values
dataset.dropna(inplace=True)

# Encode categorical features
# label_encoder = LabelEncoder()
# dataset['user_id'] = label_encoder.fit_transform(dataset['user_id'])
# dataset['song_id'] = label_encoder.fit_transform(dataset['song_id'])

# # Normalize numeric features
# dataset['rating'] = (dataset['rating'] - dataset['rating'].min()) / (dataset['rating'].max() - dataset['rating'].min())

# # Split the dataset into user-music interaction matrix
# X = dataset.pivot_table(index='user_id', columns='song_id', values='rating', fill_value=0)

# # Convert the user-music interaction matrix to a numpy array
# X = X.to_numpy()

# print("Shape of the interaction matrix:", X.shape)