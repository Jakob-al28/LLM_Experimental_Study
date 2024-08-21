import pandas as pd

file_path = 'interratedReliability.xlsx'  

sheet1 = pd.read_excel(file_path, sheet_name=0)
sheet2 = pd.read_excel(file_path, sheet_name=1)

average_scores = {}

for topic in ['relevant_topic1', 'relevant_topic2', 'relevant_topic3',
              'original_topic1', 'original_topic2', 'original_topic3']:
    average_scores[topic] = (sheet1[topic] + sheet2[topic]) / 2

average_df = pd.DataFrame(average_scores)

average_df['topic1'] = sheet1['topic1']
average_df['topic2'] = sheet1['topic2']
average_df['topic3'] = sheet1['topic3']

output_path = 'average_scores.xlsx'
average_df.to_excel(output_path, index=False)