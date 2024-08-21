"""
score relevant: 0.5384994523548741 
score original: 0.5034727830722016
"""
import pandas as pd
from sklearn.metrics import cohen_kappa_score

file_path = 'interratedReliability.xlsx'

sheet1 = pd.read_excel(file_path, sheet_name=0)
sheet2 = pd.read_excel(file_path, sheet_name=1)

relevant_scores_1 = sheet1[['relevant_topic1', 'relevant_topic2', 'relevant_topic3']].values.flatten()
original_scores_1 = sheet1[['original_topic1', 'original_topic2', 'original_topic3']].values.flatten()

relevant_scores_2 = sheet2[['relevant_topic1', 'relevant_topic2', 'relevant_topic3']].values.flatten()
original_scores_2 = sheet2[['original_topic1', 'original_topic2', 'original_topic3']].values.flatten()

kappa_relevant = cohen_kappa_score(relevant_scores_1, relevant_scores_2)
kappa_original = cohen_kappa_score(original_scores_1, original_scores_2)

print(kappa_relevant, kappa_original)