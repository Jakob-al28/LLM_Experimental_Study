# important steps: 
# replace search-input-2 with search-input
# replace _topic1 with topic1
# replace _topic2 with topic2
# replace _topic3 with topic3
# run from root
import json
import pandas as pd
from functools import partial, singledispatch
from itertools import chain
from typing import Dict, List, TypeVar
import os
import re
from collections import defaultdict
input_filepath = './data/data.json'
output_filepath = './data/_processed_data.xlsx'

query_search_map = defaultdict(dict)

Serializable = TypeVar('Serializable', None, int, bool, float, str, dict, list, tuple)
Array = List[Serializable]
Object = Dict[str, Serializable]

def flatten(object_, *, path_separator: str = '.', exclude_keys={'querySearchMap'}) -> List[Object]:
    result = []
    def flatten_helper(obj, parent_key=''):
        nonlocal result
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in exclude_keys:
                    result.append({f"{parent_key}{path_separator}{key}" if parent_key else key: value})
                elif isinstance(value, dict):
                    flatten_helper(value, f"{parent_key}{path_separator}{key}" if parent_key else key)
                elif isinstance(value, list):
                    for i, item in enumerate(value):
                        flatten_helper(item, f"{parent_key}{path_separator}{key}[{i}]" if parent_key else f"{key}[{i}]")
                else:
                    result.append({f"{parent_key}{path_separator}{key}" if parent_key else key: value})
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                flatten_helper(item, f"{parent_key}[{i}]" if parent_key else f"[{i}]")
        else:
            result.append({parent_key: obj})
    if isinstance(object_, (dict, list)):
        flatten_helper(object_)
    else:
        return [object_]
    combined_result = {}
    for item in result:
        combined_result.update(item)
    return [combined_result]

@singledispatch
def flatten_nested_objects(object_: Serializable, *, prefix: str = '', path_separator: str) -> Object:
    return {prefix[:-len(path_separator)]: object_}

@flatten_nested_objects.register(dict)
def _(object_: Object, *, prefix: str = '', path_separator: str) -> Object:
    result = dict(object_)
    for key in list(result):
        result.update(flatten_nested_objects(result.pop(key), prefix=(prefix + key + path_separator), path_separator=path_separator))
    return result

@flatten_nested_objects.register(list)
def _(object_: Array, *, prefix: str = '', path_separator: str) -> Object:
    return {prefix[:-len(path_separator)]: list(map(partial(flatten_nested_objects, path_separator=path_separator), object_))}

def consolidate_queries_responses(data):
    for item in data:
        if isinstance(item, dict):
            process_item(item, query_search_map)
        elif isinstance(item, list):
            for sub_item in item:
                if isinstance(sub_item, dict):
                    process_item(sub_item, query_search_map)
    return data

def process_item(item, query_search_map):
    _id_oid = item.get('_id', {}).get('$oid')
    page_interactions = item.get('pageInteractions', [])
    if isinstance(page_interactions, list) and page_interactions:
        for interaction in page_interactions:
            for key, value in interaction.items():
                if re.search(r'llmQueryResponses', key):
                    for query, response in value.items():
                        if _id_oid:
                            if query in query_search_map[_id_oid]:
                                query_search_map[_id_oid][query] += " | " + response
                            else:
                                query_search_map[_id_oid][query] = response
            for key, value in interaction.items():
                if re.search(r'searchQueries', key):
                    for query, response in value.items():
                        if _id_oid:
                            if query in query_search_map[_id_oid]:
                                query_search_map[_id_oid][query] += " | " + response
                            else:
                                query_search_map[_id_oid][query] = response
    keys_to_delete = [key for key in interaction.keys() if re.search(r'llmQueryResponses|searchQueries', key, re.IGNORECASE)]
    for key in keys_to_delete:
        del interaction[key]

def create_query_search_map_df(query_search_map):
    query_search_map_list = [{'_id.$oid': key, 'querySearchMap': json.dumps(value, ensure_ascii=False)} for key, value in query_search_map.items()]
    return pd.DataFrame(query_search_map_list)

def load_and_prepare_data(filepath):
    try:
        absolute_path = os.path.abspath(filepath)
        if os.path.exists(absolute_path):
            with open(absolute_path, encoding='utf-8') as file:
                data = json.load(file)
                data = consolidate_queries_responses(data)
        else:
            raise FileNotFoundError(f"No such file: '{absolute_path}'")
    except Exception as e:
        print(f"Error: {e}")
        return None

    flattened_data = [flatten(item) for item in data] if isinstance(data, list) else flatten(data)
    if all(isinstance(item, list) for item in flattened_data):
        flattened_data = [item for sublist in flattened_data for item in sublist]

    return flattened_data

flattened_data = load_and_prepare_data(input_filepath)
original_df = pd.DataFrame(flattened_data)
query_search_map_df = create_query_search_map_df(query_search_map)
merged_df = pd.merge(original_df, query_search_map_df, on='_id.$oid', how='left')
merged_df['querySearchMap'].fillna('', inplace=True)

def create_data_similarity(df):
    # Neue Spalte 'text' erstellen, die die Werte von 'topic1', 'topic2' und 'topic3' konkateniert
    df['text'] = df[['topic1', 'topic2', 'topic3']].astype(str).agg(' '.join, axis=1)
    
    # DataFrame nach 'with_llm' sortieren
    df = df.sort_values('with_llm')
    
    # Nur die benötigten Spalten beibehalten
    df = df[['id', 'with_llm', 'text']]
    
    return df


def save_to_excel(df, output_filepath):
    columns_to_delete = [
        "__v",
        "surveyResponse[0].updatedAt.$date",
        "surveyResponse[0].createdAt.$date",
        "surveyResponse[0]._id.$oid",
        "pageInteractions[0].updatedAt.$date",
        "pageInteractions[0].createdAt.$date",
        "pageInteractions[0]._id.$oid",
        "pageInteractions[0].textBoxInputs.search-input-2",
        "pageInteractions[0].textBoxInputs.search-input",
        'pageInteractions[0]_llmQueryResponses',
        'pageInteractions[0]_searchQueries',
        'llmQueryResponses',
        'searchQueries'
    ]
    df.drop(columns=columns_to_delete, errors='ignore', inplace=True)
    columns_rename_map = {
        '_id.$oid': 'id',
        'ipAddress[0]': 'ip_address',
        'pageInteractions[0].page': 'page',
        'pageInteractions[0].timeSpent': 'time_spent',
        'pageInteractions[0].tabbedOutCount': 'tabbed_out_count',
        'pageInteractions[0].queryCount': 'query_count',
        'pageInteractions[0].textBoxInputs.topic1': 'topic1',
        'pageInteractions[0].textBoxInputs.topic2': 'topic2',
        'pageInteractions[0].textBoxInputs.topic3': 'topic3',
        'pageInteractions[0].inactiveUser': 'inactive_user',
        'surveyResponse[0].age': 'age',
        'surveyResponse[0].gender': 'gender',
        'surveyResponse[0].occupation': 'occupation',
        'surveyResponse[0].semester': 'semester',
        'surveyResponse[0].education': 'education_level',
        'surveyResponse[0].taskTimeSufficient': 'task_time_sufficient',
        'surveyResponse[0].instructionsClear': 'instructions_clear',
        'surveyResponse[0].taskDifficulty': 'task_difficulty',
        'surveyResponse[0].toolsEffective': 'tools_effective',
        'surveyResponse[0].productivityImproved': 'productivity_improved',
        'surveyResponse[0].attentionCheck': 'attention_check',
        'surveyResponse[0].aiToolUsage': 'ai_tool_usage',
        'surveyResponse[0].userFriendlyInterface': 'user_friendly_interface',
        'surveyResponse[0].systemInfoSufficiency': 'system_info_sufficiency',
        'surveyResponse[0].cookie': 'cookie',
        'surveyResponse[0].AIsentiment': 'ai_sentiment',
        'surveyResponse[0].ID': 'device_id',
        'createdAt.$date': 'created_at',
        'updatedAt.$date': 'updated_at',
        'querySearchMap': 'query_search_responses'
    }
    desired_order_generative = [
        'original_topic1', 'relevant_topic1', 'topic1', 'original_topic2', 'relevant_topic2', 'topic2', 'original_topic3',
        'relevant_topic3', 'topic3', 'sum_original', 'sum_relevant', 'with_llm',
        'id', 'ip_address', 'page', 'time_spent', 'tabbed_out_count', 'query_count',
        'inactive_user', 'age', 'gender', 'occupation', 'semester', 'education_level', 'Perceived Difficulty', 'User Experience', 'Perceived Productivity', 
        'task_time_sufficient', 'instructions_clear', 'task_difficulty', 'tools_effective',
        'productivity_improved', 'attention_check', 'ai_tool_usage', 'user_friendly_interface',
        'system_info_sufficiency', 'cookie', 'ai_sentiment', 'device_id', 'created_at', 'updated_at',
        'query_search_responses'
    ]
    desired_order_retrieval = [
        'correct_topic1', 'topic1', 'correct_topic2', 'topic2', 'correct_topic3', 'topic3', 'sum_correct', 'with_llm',
        'id', 'ip_address', 'page', 'time_spent', 'tabbed_out_count', 'query_count',
        'inactive_user', 'age', 'gender', 'occupation', 'semester', 'education_level', 'Perceived_Difficulty', 'User_Experience', 'Perceived_Productivity', 
        'task_time_sufficient', 'instructions_clear', 'task_difficulty', 'tools_effective',
        'productivity_improved', 'attention_check', 'ai_tool_usage', 'user_friendly_interface',
        'system_info_sufficiency', 'cookie', 'ai_sentiment', 'device_id', 'created_at', 'updated_at',
        'query_search_responses'
    ]
    
    df.rename(columns=columns_rename_map, inplace=True)   
    df['with_llm'] = df['page'].apply(lambda x: 1 if x in ['generative_experimental.html', 'retrieval_experimental.html'] else 0)
    absolute_path2 = os.path.abspath(output_filepath)
    df.to_excel(absolute_path2, index=False)
    generative_task_data = df[df['page'].isin(['generative_control.html', 'generative_experimental.html'])]
    data_similarity = create_data_similarity(generative_task_data)
    retrieval_task_data = df[df['page'].isin(['retrieval_control.html', 'retrieval_experimental.html'])]

    generative_task_data = generative_task_data.sort_values('page')
    retrieval_task_data = retrieval_task_data.sort_values('page')
    for col in desired_order_generative:
        if col not in generative_task_data.columns:
            generative_task_data[col] = None
    # DataFrame nach der gewünschten Reihenfolge neu anordnen
    generative_task_data = generative_task_data[desired_order_generative]

    for col in desired_order_retrieval:
        if col not in retrieval_task_data.columns:
            retrieval_task_data[col] = None
    
    # DataFrame nach der gewünschten Reihenfolge neu anordnen
    retrieval_task_data = retrieval_task_data[desired_order_retrieval]
    writer = pd.ExcelWriter('./data/_processed_data.xlsx', engine='xlsxwriter')

    generative_task_data.to_excel(writer, sheet_name='Generative Task Data', index=False)
    retrieval_task_data.to_excel(writer, sheet_name='Retrieval Task Data', index=False)
    data_similarity.to_excel(writer, sheet_name='Data Similarity', index=False)

    writer.close()

    if not os.path.exists('./data/csv'):
        os.makedirs('./data/csv')

    generative_task_data.to_csv('./data/csv/generative_task_data.csv', index=False, encoding='utf-8-sig', errors='replace')
    retrieval_task_data.to_csv('./data/csv/retrieval_task_data.csv', index=False, encoding='utf-8-sig', errors='replace')
    print("Data has been processed and saved to 'processed_data.xlsx'")

save_to_excel(merged_df, output_filepath)
