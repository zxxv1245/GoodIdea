from transformers import AutoTokenizer, AutoModel
import json
import re
import torch
from openai import OpenAI
from datetime import datetime, timedelta
from fastapi import HTTPException

# KcElectra 모델 로드
tokenizer = AutoTokenizer.from_pretrained("beomi/KcELECTRA-base-v2022")
model = AutoModel.from_pretrained("beomi/KcELECTRA-base-v2022")

# 단어 임베딩 벡터 생성 함수
def generate_embedding(token):
    if not isinstance(token, str):
        token = str(token)

    inputs = tokenizer(token, return_tensors="pt", add_special_tokens=True)
    with torch.no_grad():
        outputs = model(**inputs)
        embedding = outputs.last_hidden_state[:, 0, :].squeeze().numpy()
    return embedding.tolist()

def hybrid_search(keyword, es, alpha=0.90):
    keyword_embedding = generate_embedding(f"{keyword}")
    
    knn_query = {
        "size": 50,  # 상위 50개 후보군 (임베딩 유사도 기반 검색)
        "query": {
            "script_score": {
                "query": {"match_all": {}},
                "script": {
                    "source": "cosineSimilarity(params.query_vector, 'embedding_vector') + 1.0",
                    "params": {"query_vector": keyword_embedding}
                }
            }
        }
    }
    response = es.search(index="news-token", body=knn_query)
    recommended_tokens = []
    max_count = max(hit["_source"]["count"] for hit in response["hits"]["hits"])

    for hit in response["hits"]["hits"]:
        token = hit["_source"]["token"]
        
        # keyword와 동일한 단어는 제외
        if token == keyword:
            continue
        
        similarity_score = hit["_score"] - 1.0 
        
        # 빈도수 점수 계산 및 정규화
        count = hit["_source"]["count"]
        frequency_score = count / max_count if max_count > 0 else 0  # 빈도수 점수를 0과 1 사이로 정규화
        
        # 결합 점수 계산
        combined_score = alpha * similarity_score + (1 - alpha) * frequency_score
        recommended_tokens.append((token, combined_score))

    # 결합 점수로 정렬하여 상위 10개 추천
    recommended_tokens = sorted(recommended_tokens, key=lambda x: x[1], reverse=True)[:10]
    unique_recommended_tokens = list(dict.fromkeys([token for token, _ in recommended_tokens]))

    return unique_recommended_tokens[:10]  # 상위 10개의 유니크한 추천 결과 반환


def get_top_tokens_last_7_days(es):
    # 현재 시간 기준으로 7일 전 날짜 계산
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    query = {
            "size": 0,  # 문서 자체는 가져오지 않고 집계 결과만 필요
            "query": {
                "bool": {
                    "filter": [
                        {
                            "range": {
                                "date": {
                                    "gte": start_date.strftime("%Y%m%d"),
                                    "lte": end_date.strftime("%Y%m%d")
                                }
                            }
                        }
                    ]
                }
            },
            "aggs": {
                "top_tokens": {
                    "terms": {
                        "field": "tokens",   # 배열 내 개별 단어를 집계 대상으로 설정
                        "size": 10,         # 상위 n개 단어
                        "order": {"_count": "desc"} # 빈도수 기준 정렬
                    }
                }
            }
        }
    
    # Elasticsearch 검색 실행
    response = es.search(index="news-topic", body=query)
    # print(response)
    
    # 상위 토큰 추출
    top_tokens = [bucket["key"] for bucket in response["aggregations"]["top_tokens"]["buckets"]]
    
    return top_tokens

def createAIPlanner(OPEN_AI_KEY, payload_dict:dict):
    client = OpenAI(
        api_key = OPEN_AI_KEY
    )
    # 프롬프트 구성
    prompt = f"""
    You are an AI assistant responsible for drafting a professional and comprehensive project proposal summary. Your goal is to write a highly detailed response with the same depth and clarity as the provided examples. For each section, deliver a clear, structured, and insightful summary that explains the project’s purpose, core components, and expected impact. Make the content sophisticated and meaningful, using high-level language, logical flow, and ensuring each section is well-developed with nuanced, domain-specific details.
    
    Please return the response in the following JSON format in Korean:
    
    {{
        "background": "Sophisticated 1-3 sentence summary for background in Korean, including project motivations, relevant challenges, and the problem it seeks to solve.",
        "introduction": "Detailed 1-3 sentence summary for service introduction in Korean, emphasizing the core service goals and key features with domain-specific insights.",
        "target": "1-3 sentence summary for target users in Korean, clearly explaining user benefits and how each user group gains value from the service.",
        "expectedEffect": "Well-developed 1-3 sentence summary for expected effects in Korean, summarizing anticipated impacts on users and the broader industry/society.",
        "projectTopic": "6-9 sentence summary recommending three nuanced, domain-specific project topics suitable for six junior developers, highlighting key points for each topic in sophisticated language.",
        "techStack": "In-depth 6-sentence summary recommending a tech stack for each topic, tailored to the project goals and featuring notable frameworks, libraries, and technologies.",
        "advancedStack": "Challenging tech stack recommendations with advanced options for each topic, including libraries or CS-based technologies with concise, meaningful descriptions."
    }}
    
    Detailed guidelines for each section:
    
    1. **Background**: 
       - Provide a nuanced, sophisticated description of the project's motivation, background, and necessity.
       - Connect the problem being addressed to the project’s purpose, emphasizing why this service is essential for the target audience.
       - Use the following keywords to shape this section: {", ".join(payload_dict["background"])}.
    
    2. **Service Introduction**: 
       - Give a well-developed overview of the service's main goals and features, emphasizing their value and role in addressing the problem.
       - Explain how each main feature contributes to solving the problem or achieving the project’s goals, using high-level terminology to avoid repetitive phrasing.
    
    3. **Target Users**: 
       - Identify the primary user groups for this service and describe how each group will benefit, focusing on how this service addresses specific user needs.
       - Relate each user group’s benefits to the project’s objectives, explaining how they gain lasting value from this service.
    
    4. **Expected Effects**: 
       - Summarize the anticipated impacts of this project in a nuanced way, including specific improvements, awareness, or behavioral changes it aims to foster.
       - Describe the broader societal or industry impact expected from this project, using the following keywords: {", ".join(payload_dict["expected_effects"])}.
    
    5. **Project Topics**: 
       - Based on the content above, recommend three project topics suitable for six junior developers.
       - Briefly describe each topic in sophisticated language, with key points that give each topic depth and structure.
    
    6. **Tech Stack Recommendations**: 
       - For each recommended topic in section 5, provide an in-depth description of the basic tech stack.
       - Include one-sentence descriptions of each component, emphasizing their relevance to the project and why they are suitable.
    
    7. **Challenging Stack/Technology Recommendations**: 
       - Recommend a more challenging tech stack for each topic, featuring creative options or CS-based technologies.
       - Describe each recommended technology with concise yet sophisticated explanations that highlight their advanced uses.
    """


    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are an AI assistant that drafts concise project proposal summaries. Each section (Background, Service Introduction, Target Users, Expected Effects) must be filled out with meaningful content."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
    )
    
    text_response = response.choices[0].message.content.strip()

    json_match = re.search(r'(\{.*\})', text_response, re.DOTALL)
    if json_match:
        json_str = json_match.group(0)
        try:
            response_dict = json.loads(json_str)
        except json.JSONDecodeError:
            print("JSON 파싱 에러 발생 - 올바른 JSON 형식으로 변환되지 않았습니다.")
            response_dict = {"background": "", "service_intro": "", "target_users": "", "expected_effects": ""}
    else:
        print("JSON 형식을 찾을 수 없음.")
        response_dict = {"background": "", "service_intro": "", "target_users": "", "expected_effects": ""}

    return response_dict