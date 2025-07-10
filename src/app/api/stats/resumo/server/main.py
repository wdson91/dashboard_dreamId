from flask import Flask, request, jsonify,send_file
from datetime import datetime, date, timedelta
from collections import defaultdict
import os
import pytz
from flask_cors import CORS
from dotenv import load_dotenv
from flask_caching import Cache
from threading import Thread
import requests
from openai_integration import OpenAIIntegration


from decorator import require_valid_token
from utils.supabaseUtil import get_supabase
from utils.parse_faturas import parse_faturas
from getFaturas import get_faturas
from utils.utils import is_valid_nif, get_periodo_datas, buscar_faturas_periodo, parse_periodo, calcular_stats, agrupar_por_hora, gerar_comparativo_por_hora, limpar_cache_por_nif , calcular_variacao_dados, gerar_dados_resumo_ia, processar_faturas_otimizado


# Configuração
load_dotenv()
app = Flask(__name__)
CORS(app)


app.config.from_mapping({
    'CACHE_TYPE': 'RedisCache',
    'CACHE_REDIS_URL': os.getenv('REDIS_URL'),
    'CACHE_DEFAULT_TIMEOUT': 180,
})
cache = Cache(app)
supabase = get_supabase()
TZ = pytz.timezone('Europe/Lisbon')

# Helpers

def current_time_str(fmt='%H:%M'):
    return datetime.now(TZ).strftime(fmt)


def cache_key():
    nif = request.args.get('nif', '')
    periodo = request.args.get('periodo', '0')
    return f"{request.path}/{nif}/{periodo}"

def cache_key_analise_completa():
    """Chave de cache específica para análise completa"""
    nif = request.args.get('nif', '')
    filial = request.args.get('filial', '')
    periodo = request.args.get('periodo', '0')
    return f"analise_completa/{nif}/{filial}/{periodo}"

def precache_essenciais(nif, token):
    base = 'http://localhost:8000/api'
    endpoints = [f"{base}/{path}?nif={nif}{'&periodo='+str(p) if 'products' in path else ''}" 
                 for path, p in [('stats', None), ('stats/resumo', 0), ('products', 0), ('products', 1)]]
    headers = {'Authorization': f'Bearer {token}'}
    for url in endpoints:
        try:
            requests.get(url, headers=headers, timeout=10)
        except: pass
    cache.set(f'ultima_atualizacao:{nif}', datetime.now(TZ).strftime('%d-%m %H:%M'))

# Endpoints

@app.route("/")
def home():
    return "hello"


@app.route('/api/stats/today', methods=['GET'])
@require_valid_token
@cache.cached(timeout=180, key_prefix=cache_key)
def stats():
    nif = request.args.get('nif', '')
    if not nif.isdigit():
        return jsonify({'error': 'NIF é obrigatório e deve conter apenas números'}), 400

    hoje = date.today()
    # query faturas
    res = supabase.table('faturas_fatura').select('*, itens:faturas_itemfatura(*)') \
        .eq('nif', nif).eq('data', hoje.isoformat()).execute()
    faturas = [f for f in (res.data or []) if str(f.get('nif')) == nif]

    total_vendas = sum(float(f['total']) for f in faturas)
    total_itens = sum(item['quantidade'] for f in faturas for item in f.get('itens', []))
    produtos = sorted(({'produto': k, 'quantidade': v} for k, v in 
                       defaultdict(int, ((item['nome'], item['quantidade'])
                        for f in faturas for item in f.get('itens', []))).items()),
                      key=lambda x: x['quantidade'], reverse=True)

    vendas_por_hora = defaultdict(float)
    for f in faturas:
        h = f.get('hora', '')[:2] + ':00'
        vendas_por_hora[h] += float(f['total']) if f.get('hora') else 0
    base = {'08:00', '12:00', '18:00'} | set(vendas_por_hora)
    vendas_horarias = [{'hora': h, 'total': round(vendas_por_hora.get(h, 0), 2)} for h in sorted(base)]

    # últimos 7 dias
    ontem = hoje - timedelta(days=1)
    inicio = hoje - timedelta(days=7)
    res7 = supabase.table('faturas_fatura').select('data, total') \
        .gte('data', inicio.isoformat()).lte('data', ontem.isoformat()).execute()
    vendas7 = defaultdict(float)
    for f in res7.data or []:
        vendas7[f['data']] += float(f['total'])
    ult7 = [{'data': d, 'total': round(t, 2)} for d, t in sorted(vendas7.items())]

    resultado = {'dados': {
        'total_vendas': round(total_vendas, 2),
        'total_itens': total_itens,
        'vendas_por_dia': [{'data': str(hoje), 'total': round(total_vendas, 2)}],
        'vendas_por_hora': vendas_horarias,
        'vendas_por_produto': produtos,
        'quantidade_faturas': len(faturas),
        'filtro_data': str(hoje),
        'ultima_atualizacao': current_time_str(),
        'ultimos_7_dias': ult7,
        'total_ultimos_7_dias': round(sum(v['total'] for v in ult7), 2)
    }}
    return jsonify(resultado), 200

@app.route('/api/stats/report', methods=['GET'])
@require_valid_token
@cache.cached(timeout=180, key_prefix=cache_key)
def report():
    nif = request.args.get('nif', '')
    if not nif:
        return jsonify({'error': 'NIF é obrigatório'}), 400
    hoje = date.today()
    ontem = hoje - timedelta(days=1)
    inicio = hoje - timedelta(days=7)

    fetch = lambda q: (supabase.table('faturas_fatura').select('*')
                       .eq(*q).execute().data or [])
    fh = fetch(('data', hoje.isoformat())), fetch(('gte', inicio.isoformat()), ('lte', ontem.isoformat()))
    f_hoje, f_7d = fh

    def agg(fats):
        d = defaultdict(lambda: {'volume': 0.0, 'quantidade': 0})
        for f in fats:
            h = f.get('hora', '')[:2] + ':00'
            d[h]['volume'] += float(f.get('total', 0))
            d[h]['quantidade'] += 1
        return d
    t_hoje, t_7d = agg(f_hoje), agg(f_7d)
    hrs = sorted(set(t_hoje) | set(t_7d))
    vp = [{'hora': h, 'faturas_hoje': t_hoje[h]['quantidade'], 'volume_hoje': round(t_hoje[h]['volume'],2),
           'faturas_7_dias': t_7d[h]['quantidade'], 'volume_7_dias': round(t_7d[h]['volume'],2)} for h in hrs]

    vendas_dia = [{'data': hoje.isoformat(), 'total': round(sum(float(f['total']) for f in f_hoje),2)}]
    v7d = defaultdict(float)
    for f in f_7d: v7d[f['data']] += float(f.get('total',0))
    ult7 = [{'data': d, 'total': round(t,2)} for d,t in sorted(v7d.items())]

    resp = {'dados': {
        'total_vendas': round(sum(float(f['total']) for f in f_hoje),2),
        'quantidade_faturas': len(f_hoje),
        'vendas_por_dia': vendas_dia,
        'vendas_por_hora': vp,
        'filtro_data': hoje.isoformat(),
        'ultima_atualizacao': current_time_str(),
        'ultimos_7_dias': ult7,
        'total_ultimos_7_dias': round(sum(x['total'] for x in ult7),2),
        'quantidade_faturas_7_dias': len(f_7d)
    }}
    cache.set(f'ultima_atualizacao:{nif}', datetime.now(TZ).strftime('%d-%m %H:%M'))
    return jsonify(resp)

@app.route('/api/products', methods=['GET'])
@require_valid_token
@cache.cached(timeout=180, key_prefix=cache_key)
def products():
    nif = request.args.get('nif', '').strip()
    filial = request.args.get('filial', '').strip() or None  # Se não vier, será None

    if not is_valid_nif(nif):
        return jsonify({'error': 'NIF é obrigatório e deve conter apenas números'}), 400

    try:
        p = int(request.args.get('periodo', 0))
    except:
        return jsonify({'error': 'Período inválido.'}), 400

    try:
        di, df, dia, df_an = get_periodo_datas(p)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    # Buscar faturas com ou sem filtro por filial
    fats = buscar_faturas_periodo(nif, di, df, filial=filial)

    cont = defaultdict(lambda: {'quantidade': 0, 'montante': 0.0})
    ti = mi = 0

    for f in fats:
        for it in f.get('faturas_itemfatura', []):
            cont[it['nome']]['quantidade'] += it['quantidade']
            cont[it['nome']]['montante'] += it['quantidade'] * float(it['preco_unitario'])
            ti += it['quantidade']
            mi += it['quantidade'] * float(it['preco_unitario'])

    itens = sorted([
        {
            'produto': k,
            'quantidade': d['quantidade'],
            'montante': round(d['montante'], 2),
            'porcentagem_montante': round(d['montante'] / mi * 100, 2) if mi else 0.0
        } for k, d in cont.items()
    ], key=lambda x: x['montante'], reverse=True)

    result = {
        'periodo': parse_periodo(p),
        'data_inicio': str(di),
        'data_fim': str(df),
        'total_itens': ti,
        'total_montante': round(mi, 2),
        'itens': itens
    }

    chave_cache = f'ultima_atualizacao:{nif}'
    if filial:
        chave_cache += f'_{filial}'

    cache.set(chave_cache, datetime.now(TZ).strftime('%d-%m %H:%M'))
    return jsonify(result), 200


@app.route('/api/limparcache', methods=['DELETE'])
@require_valid_token
def limpar_cache():
    nif = request.args.get('nif', '')
    if not nif:
        return jsonify({'error': 'NIF é obrigatório'}), 400
    try:
        limpar_cache_por_nif(nif)
        token = request.headers.get('Authorization','').replace('Bearer ','')
        Thread(target=precache_essenciais, args=(nif, token)).start()
        return jsonify({'message': 'Cache limpo e atualização em background iniciada'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/limparcache-analise-completa', methods=['DELETE'])
@require_valid_token
def limpar_cache_analise_completa():
    """Limpa especificamente o cache da análise completa"""
    nif = request.args.get('nif', '')
    filial = request.args.get('filial', '')
    periodo = request.args.get('periodo', '')
    
    if not nif:
        return jsonify({'error': 'NIF é obrigatório'}), 400
    
    try:
        # Limpar cache específico da análise completa
        chaves_limpas = 0
        
        if periodo:
            # Limpar cache específico do período
            cache_key = f"analise_completa/{nif}/{filial}/{periodo}"
            if cache.delete(cache_key):
                chaves_limpas += 1
        else:
            # Limpar todos os caches da análise completa para este NIF
            for p in range(6):  # Períodos 0-5
                cache_key = f"analise_completa/{nif}/{filial}/{p}"
                if cache.delete(cache_key):
                    chaves_limpas += 1
        
        return jsonify({
            'success': True,
            'message': f'Cache da análise completa limpo para NIF {nif}',
            'chaves_limpas': chaves_limpas,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ultima-atualizacao', methods=['GET'])
@require_valid_token
def ultima_atualizacao():
    nif = request.args.get('nif', '')
    if not nif:
        return jsonify({'error': 'NIF é obrigatório'}), 400
    val = cache.get(f'ultima_atualizacao:{nif}') or datetime.now(TZ).strftime('%d-%m %H:%M')
    return jsonify({'nif': nif, 'ultima_atualizacao': val}), 200


@app.route('/api/stats/resumo', methods=['GET'])
def resumo_stats():
    if request.method == "OPTIONS":
        response = jsonify({"message": "OK"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response, 200

    nif = request.args.get('nif', '').strip()
    filial = request.args.get('filial', '').strip() or None  # Se não vier, será None

    if not is_valid_nif(nif):
        return jsonify({'error': 'NIF inválido'}), 400

    try:
        p = int(request.args.get('periodo', '0'))
    except:
        return jsonify({'error': 'Período inválido'}), 400

    try:
        di, df, dia, dfan = get_periodo_datas(p)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    # OTIMIZAÇÃO: Uma única chamada ao banco para ambos os períodos
    # Buscar faturas do período mais amplo (anterior + atual)
    data_mais_antiga = min(dia, di)
    data_mais_recente = max(dfan, df)
    
    # Uma única consulta ao banco
    faturas_completas = buscar_faturas_periodo(nif, data_mais_antiga, data_mais_recente, filial=filial)
    
    # Processar todas as faturas de uma vez usando a função otimizada
    dados_processados = processar_faturas_otimizado(faturas_completas, di, df, dia, dfan)
    
    # Extrair dados processados
    total_at, rec_at, it_at, tk_at = dados_processados['stats_atual']
    total_bt, rec_bt, it_bt, tk_bt = dados_processados['stats_anterior']
    comp = dados_processados['comparativo_por_hora']

    data = {
        'periodo': parse_periodo(p),
        'total_vendas': calcular_variacao_dados(total_at, total_bt),
        'numero_recibos': calcular_variacao_dados(rec_at, rec_bt),
        'itens_vendidos': calcular_variacao_dados(it_at, it_bt),
        'ticket_medio': calcular_variacao_dados(tk_at, tk_bt),
        'comparativo_por_hora': comp
    }

    chave_cache = f'ultima_atualizacao:{nif}'
    if filial:
        chave_cache += f'_{filial}'

    #cache.set(chave_cache, datetime.now(TZ).strftime('%d-%m %H:%M'))

    return jsonify(data), 200


@app.route('/api/upload-fatura', methods=['POST'])
def upload_fatura():
    if 'file' not in request.files:
        return jsonify({'erro': 'Arquivo não enviado'}), 400

    f = request.files['file']
    if not f.filename:
        return jsonify({'erro': 'Arquivo sem nome'}), 400

    try:
        text = f.read().decode('utf-8')
    except UnicodeDecodeError:
        return jsonify({'erro': 'Arquivo com codificação inválida. Use UTF-8'}), 400

    try:
        fats = parse_faturas(text)
        if not fats:
            return jsonify({'erro': 'Nenhuma fatura válida encontrada no arquivo'}), 400
    except Exception as e:
        return jsonify({'erro': str(e)}), 400

    criadas, erros = [], []

    for fa in fats:
        # Agora 'filial' também é obrigatório
        campos_obrigatorios = ['numero_fatura', 'data', 'hora', 'total', 'nif_emitente', 'nif_cliente', 'itens', 'filial']
        if any(not fa.get(c) for c in campos_obrigatorios):
            erros.append({
                'numero_fatura': fa.get('numero_fatura', 'desconhecido'),
                'erro': 'Campos obrigatórios faltando'
            })
            continue

        nf = fa['numero_fatura'].replace('/', '_').replace(' ', '')
        now = datetime.utcnow().isoformat()

        try:
            res = supabase.table('faturas_fatura').insert({
                'numero_fatura': nf,
                'data': fa['data'],
                'hora': fa['hora'],
                'total': float(fa['total']),
                'texto_original': fa['texto_original'],
                'texto_completo': fa['texto_completo'],
                'qrcode': fa['qrcode'],
                'filial': fa['filial'],  # 👈 campo filial incluído
                'nif': fa['nif_emitente'],
                'nif_cliente': fa['nif_cliente'],
                'criado_em': now,
                'atualizado_em': now
            }).execute()

            if not res.data:
                raise ValueError('Falha ao inserir fatura no banco de dados')

            fid = res.data[0]['id']

            for it in fa['itens']:
                supabase.table('faturas_itemfatura').insert({
                    'fatura_id': fid,
                    'nome': it['nome'],
                    'quantidade': it['quantidade'],
                    'preco_unitario': float(it['preco_unitario']),
                    'total': float(it['total'])
                }).execute()

            criadas.append(res.data[0])

        except Exception as e:
            msg = str(e)
            erros.append({'numero_fatura': nf, 'erro': msg})

    # Limpar cache da análise completa para os NIFs das faturas criadas
    if criadas:
        nifs_afetados = set()
        for fatura in criadas:
            nifs_afetados.add(fatura.get('nif'))
        
        # Limpar cache para todos os períodos e filiais dos NIFs afetados
        for nif_afetado in nifs_afetados:
            for periodo in range(6):  # Períodos 0-5
                # Limpar cache sem filial específica
                cache_key = f"analise_completa/{nif_afetado}//{periodo}"
                cache.delete(cache_key)
                
                # Limpar cache com filial (se houver)
                for fatura in criadas:
                    if fatura.get('nif') == nif_afetado:
                        filial_fatura = fatura.get('filial', '')
                        if filial_fatura:
                            cache_key_filial = f"analise_completa/{nif_afetado}/{filial_fatura}/{periodo}"
                            cache.delete(cache_key_filial)

    status = 201 if criadas else 400
    return jsonify({
        'mensagem': f'{len(criadas)} fatura(s) processada(s) com sucesso',
        'faturas': criadas,
        'erros': erros,
        'cache_limpo': len(nifs_afetados) if criadas else 0
    }), status



@app.route("/api/faturas", methods=["GET"])
@require_valid_token
def buscar_faturas_periodo_route():
    nif = request.args.get("nif", "").strip()
    filial = request.args.get("filial", "").strip() or None
    periodo_raw = request.args.get("periodo", "0")

    if not nif or not nif.isdigit():
        return jsonify({"error": "NIF é obrigatório e deve conter apenas números"}), 400

    try:
        periodo = int(periodo_raw)
    except ValueError:
        return jsonify({"error": "Período inválido. Deve ser um número inteiro."}), 400

    try:
        data_inicio, data_fim, inicio_anterior, fim_anterior = get_periodo_datas(periodo)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Consulta no Supabase
    query = supabase.table("faturas_fatura") \
        .select("id, data, total, numero_fatura, hora, nif_cliente") \
        .eq("nif", nif) \
        .gte("data", data_inicio.isoformat()) \
        .lte("data", data_fim.isoformat())

    if filial:
        query = query.eq("filial", filial)

    result = query.execute()
    faturas = result.data or []

    if not faturas:
        return jsonify({"message": "Nenhuma fatura encontrada para esse período."}), 404

    return jsonify({
        "faturas": faturas,
        "periodo": {
            "inicio": str(data_inicio),
            "fim": str(data_fim)
        }
    }), 200


from utils.gerarPdf import gerar_pdf
@app.route('/api/faturas/pdf', methods=['GET'])
def baixar_fatura_pdf():
    # Busca no Supabase pelo número da fatura

    numero_fatura = request.args.get('numero_fatura', '').strip()
    
    response = supabase.table("faturas_fatura") \
        .select("texto_completo, qrcode") \
        .eq("numero_fatura", numero_fatura) \
        .single() \
        .execute()

    
    
    fatura = response.data
    if not fatura:
        return jsonify({"error": "Fatura não encontrada"}), 404

    texto_completo = fatura.get("texto_completo")
    if not texto_completo:
        return jsonify({"error": "Texto completo da fatura não encontrado"}), 404
    qrcode = fatura.get("qrcode")
    pdf_buffer = gerar_pdf(texto_completo,qrcode)

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f'fatura_{numero_fatura}.pdf',
        mimetype='application/pdf'
    )


@app.route("/api/faturas/todas", methods=["GET"])
@require_valid_token
def buscar_todas_faturas():
    nif = request.args.get("nif")  # Obtém o NIF do query param
    
    if not nif or not nif.isdigit():
        return jsonify({"error": "NIF é obrigatório e deve conter apenas números"}), 400

    # Consulta no Supabase (sem filtro de data)
    result = supabase.table("faturas_fatura") \
        .select("numero_fatura, total, hora, data,nif_cliente") \
        .eq("nif", nif) \
        .order("data", desc=True) \
        .execute()

    faturas = result.data or []
    
    if not faturas:
        return jsonify({"message": "Nenhuma fatura encontrada para este NIF."}), 404

    return jsonify({"faturas": faturas, "total": len(faturas)})

@app.route("/api/heatmap", methods=["GET"])
@require_valid_token
#@cache.cached(timeout=180, key_prefix=cache_key)
def heatmap_horarios():
    """
    Retorna dados para gerar um heatmap de horários (hora × dia da semana)
    para análise de padrões de consumo.
    """
    nif = request.args.get("nif")
    if not is_valid_nif(nif):
        return jsonify({"error": "NIF é obrigatório e deve conter apenas números"}), 400

    # Parâmetros para período
    try:
        periodo = int(request.args.get("periodo", "0"))  # Padrão: hoje (0)
    except ValueError:
        return jsonify({"error": "Período inválido. Deve ser um número inteiro de 0 a 5."}), 400

    try:
        data_inicio, data_fim, data_inicio_anterior, data_fim_anterior = get_periodo_datas(periodo)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # OTIMIZAÇÃO: Uma única chamada ao banco para ambos os períodos
    # Buscar faturas do período mais amplo (anterior + atual)
    data_mais_antiga = min(data_inicio_anterior, data_inicio)
    data_mais_recente = max(data_fim_anterior, data_fim)
    
    # Uma única consulta ao banco
    faturas_completas = buscar_faturas_periodo(nif, data_mais_antiga, data_mais_recente)
    
    # Processar todas as faturas de uma vez usando a função otimizada
    dados_processados = processar_faturas_otimizado(faturas_completas, data_inicio, data_fim, data_inicio_anterior, data_fim_anterior)
    
    # Extrair faturas separadas por período
    faturas = dados_processados['faturas_atual']
    faturas_anterior = dados_processados['faturas_anterior']
    
    if not faturas and not faturas_anterior:
        return jsonify({
            "message": "Nenhuma fatura encontrada para o período especificado",
            "dados": [],
            "periodo": parse_periodo(periodo)
        }), 200

    # Estrutura para armazenar dados do heatmap
    # heatmap_data[hora][dia_semana] = {"volume": 0.0, "quantidade": 0}
    heatmap_data = {}
    
    # Inicializar estrutura com todas as horas (0-23) e dias da semana (0-6)
    for hora in range(24):
        heatmap_data[hora] = {}
        for dia in range(7):  # 0=Segunda, 1=Terça, ..., 6=Domingo
            heatmap_data[hora][dia] = {"volume": 0.0, "quantidade": 0}

    # Processar cada fatura
    for fatura in faturas:
        try:
            # Extrair data e hora da fatura
            data_str = fatura.get("data")
            hora_str = fatura.get("hora")
            
            if not data_str or not hora_str:
                continue
                
            # Converter data
            data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
            
            # Extrair hora (formato esperado: "HH:MM:SS" ou "HH:MM")
            if ":" in hora_str:
                hora_parts = hora_str.split(":")
                hora = int(hora_parts[0])
            else:
                continue
                
            # Calcular dia da semana (0=Segunda, 6=Domingo)
            # weekday() retorna 0=Segunda, 6=Domingo, mas queremos 0=Segunda
            dia_semana = data_obj.weekday()
            
            # Volume da fatura
            volume = float(fatura.get("total", 0))
            
            # Acumular dados
            if 0 <= hora < 24 and 0 <= dia_semana < 7:
                heatmap_data[hora][dia_semana]["volume"] += volume
                heatmap_data[hora][dia_semana]["quantidade"] += 1
                
        except (ValueError, TypeError, KeyError) as e:
            # Ignorar faturas com dados inválidos
            continue

    # Converter para formato de resposta
    dados_heatmap = []
    nomes_dias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    
    for hora in range(24):
        for dia in range(7):
            dados = heatmap_data[hora][dia]
            if dados["quantidade"] > 0:  # Só incluir células com dados
                dados_heatmap.append({
                    "hora": f"{hora:02d}:00",
                    "hora_num": hora,
                    "dia_semana": nomes_dias[dia],
                    "dia_num": dia,
                    "volume": round(dados["volume"], 2),
                    "quantidade_faturas": dados["quantidade"],
                    "ticket_medio": round(dados["volume"] / dados["quantidade"], 2) if dados["quantidade"] > 0 else 0.0
                })

    # faturas_anterior já foi obtida na consulta única acima
    
    # Processar dados do período anterior
    heatmap_data_anterior = {}
    for hora in range(24):
        heatmap_data_anterior[hora] = {}
        for dia in range(7):
            heatmap_data_anterior[hora][dia] = {"volume": 0.0, "quantidade": 0}

    for fatura in faturas_anterior:
        try:
            data_str = fatura.get("data")
            hora_str = fatura.get("hora")
            
            if not data_str or not hora_str:
                continue
                
            data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
            
            if ":" in hora_str:
                hora_parts = hora_str.split(":")
                hora = int(hora_parts[0])
            else:
                continue
                
            dia_semana = data_obj.weekday()
            volume = float(fatura.get("total", 0))
            
            if 0 <= hora < 24 and 0 <= dia_semana < 7:
                heatmap_data_anterior[hora][dia_semana]["volume"] += volume
                heatmap_data_anterior[hora][dia_semana]["quantidade"] += 1
                
        except (ValueError, TypeError, KeyError) as e:
            continue

    # Calcular estatísticas gerais
    total_volume = sum(d["volume"] for d in dados_heatmap)
    total_faturas = sum(d["quantidade_faturas"] for d in dados_heatmap)
    
    # Calcular estatísticas do período anterior
    total_volume_anterior = sum(d["volume"] for d in heatmap_data_anterior.values() for d in d.values())
    total_faturas_anterior = sum(d["quantidade"] for d in heatmap_data_anterior.values() for d in d.values())
    
    # Encontrar horários de pico
    if dados_heatmap:
        pico_volume = max(dados_heatmap, key=lambda x: x["volume"])
        pico_quantidade = max(dados_heatmap, key=lambda x: x["quantidade_faturas"])
    else:
        pico_volume = pico_quantidade = None

    # Calcular variação
    variacao_volume = calcular_variacao_dados(total_volume, total_volume_anterior)
    variacao_faturas = calcular_variacao_dados(total_faturas, total_faturas_anterior)

    resultado = {
        "dados": dados_heatmap,
        "estatisticas": {
            "total_volume": round(total_volume, 2),
            "total_faturas": total_faturas,
            "periodo": parse_periodo(periodo),
            "data_inicio": str(data_inicio),
            "data_fim": str(data_fim),
            "quantidade_celulas_com_dados": len(dados_heatmap),
            "variacao_volume": variacao_volume,
            "variacao_faturas": variacao_faturas
        },
        "periodo_anterior": {
            "total_volume": round(total_volume_anterior, 2),
            "total_faturas": total_faturas_anterior,
            "data_inicio": str(data_inicio_anterior),
            "data_fim": str(data_fim_anterior)
        },
        "picos": {
            "maior_volume": {
                "hora": pico_volume["hora"],
                "dia": pico_volume["dia_semana"],
                "volume": pico_volume["volume"]
            } if pico_volume else None,
            "maior_quantidade": {
                "hora": pico_quantidade["hora"],
                "dia": pico_quantidade["dia_semana"],
                "quantidade": pico_quantidade["quantidade_faturas"]
            } if pico_quantidade else None
        },
        "nomes_dias": nomes_dias,
        "horas_disponiveis": [f"{h:02d}:00" for h in range(24)]
    }

    #marcar_atualizacao_cache(nif)
    return jsonify(resultado), 200




@app.route("/api/analise-completa", methods=["GET"])
@require_valid_token
@cache.cached(timeout=180, key_prefix=cache_key_analise_completa)
def analise_completa():
   
    
    try:
        # Obter parâmetros
        nif = request.args.get("nif")
        if not is_valid_nif(nif):
            return jsonify({"error": "NIF é obrigatório e deve conter apenas números"}), 400

        filial = request.args.get("filial", "").strip() or None
        
        try:
            periodo = int(request.args.get("periodo", "0"))
        except ValueError:
            return jsonify({"error": "Período inválido. Deve ser um número inteiro de 0 a 5."}), 400

        # 1. Obter dados do resumo geral
        try:
            data_inicio, data_fim, data_inicio_anterior, data_fim_anterior = get_periodo_datas(periodo)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        # OTIMIZAÇÃO: Uma única chamada ao banco para ambos os períodos
        # Buscar faturas do período mais amplo (anterior + atual)
        data_mais_antiga = min(data_inicio_anterior, data_inicio)
        data_mais_recente = max(data_fim_anterior, data_fim)
        
        # Uma única consulta ao banco
        faturas_completas = buscar_faturas_periodo(nif, data_mais_antiga, data_mais_recente, filial=filial)
        
        # Processar todas as faturas de uma vez usando a função otimizada
        dados_processados = processar_faturas_otimizado(faturas_completas, data_inicio, data_fim, data_inicio_anterior, data_fim_anterior)
        
        # Extrair dados processados
        total_atual, recibos_atual, itens_atual, ticket_atual = dados_processados['stats_atual']
        total_anterior, recibos_anterior, itens_anterior, ticket_anterior = dados_processados['stats_anterior']
        comparativo_por_hora = dados_processados['comparativo_por_hora']
        faturas_atual = dados_processados['faturas_atual']
        faturas_anterior = dados_processados['faturas_anterior']

        # Produtos mais vendidos
        contagem_produtos = defaultdict(lambda: {"quantidade": 0, "montante": 0.0})
        total_montante = 0.0

        for f in faturas_atual:
            for item in (f.get("faturas_itemfatura") or []):
                nome = item.get("nome")
                qtd = item.get("quantidade", 0)
                preco_unitario = float(item.get("preco_unitario", 0.0))

                contagem_produtos[nome]["quantidade"] += qtd
                contagem_produtos[nome]["montante"] += qtd * preco_unitario
                total_montante += qtd * preco_unitario

        produtos_mais_vendidos = sorted([
            {
                "produto": nome,
                "quantidade": dados["quantidade"],
                "montante": round(dados["montante"], 2),
                "porcentagem_montante": round((dados["montante"] / total_montante) * 100, 2) if total_montante else 0.0
            }
            for nome, dados in contagem_produtos.items()
        ], key=lambda x: x["montante"], reverse=True)[:10]

        # Heatmap data
        heatmap_data = {}
        for hora in range(24):
            heatmap_data[hora] = {}
            for dia in range(7):
                heatmap_data[hora][dia] = {"volume": 0.0, "quantidade": 0}

        for fatura in faturas_atual:
            try:
                data_str = fatura.get("data")
                hora_str = fatura.get("hora")
                
                if not data_str or not hora_str:
                    continue
                    
                data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
                
                if ":" in hora_str:
                    hora_parts = hora_str.split(":")
                    hora = int(hora_parts[0])
                else:
                    continue
                    
                dia_semana = data_obj.weekday()
                volume = float(fatura.get("total", 0))
                
                if 0 <= hora < 24 and 0 <= dia_semana < 7:
                    heatmap_data[hora][dia_semana]["volume"] += volume
                    heatmap_data[hora][dia_semana]["quantidade"] += 1
                    
            except (ValueError, TypeError, KeyError) as e:
                continue

        # Picos do heatmap
        picos_heatmap = []
        for hora in range(24):
            for dia in range(7):
                dados = heatmap_data[hora][dia]
                if dados["quantidade"] > 0:
                    picos_heatmap.append({
                        "hora": f"{hora:02d}:00",
                        "dia_semana": ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][dia],
                        "volume": round(dados["volume"], 2),
                        "quantidade_faturas": dados["quantidade"]
                    })

        picos_heatmap = sorted(picos_heatmap, key=lambda x: x["volume"], reverse=True)[:5]

        # Vendas por dia (últimos 7 dias)
        hoje = date.today()
        sete_dias_atras = hoje - timedelta(days=7)
        vendas_por_dia = defaultdict(float)
        
        for f in faturas_atual:
            if f.get("data") >= sete_dias_atras.isoformat():
                vendas_por_dia[f["data"]] += float(f.get("total", 0))

        vendas_ultimos_7_dias = [
            {"data": dia, "total": round(total, 2)}
            for dia, total in sorted(vendas_por_dia.items())
        ]

        # Informações de filiais
        filiais_info = {}
        if not filial:
            query = supabase.table("faturas_fatura") \
                .select("filial, total") \
                .eq("nif", nif) \
                .gte("data", data_inicio.isoformat()) \
                .lte("data", data_fim.isoformat()) \
                .execute()
            
            filiais_data = query.data or []
            filiais_agg = defaultdict(float)
            for f in filiais_data:
                filiais_agg[f.get("filial", "Sem filial")] += float(f.get("total", 0))
            
            filiais_info = {
                "total_filiais": len(filiais_agg),
                "volume_por_filial": [
                    {"filial": filial, "volume": round(volume, 2)}
                    for filial, volume in sorted(filiais_agg.items(), key=lambda x: x[1], reverse=True)
                ]
            }

        # Métricas de performance
        ticket_medio_atual = round(total_atual / recibos_atual, 2) if recibos_atual > 0 else 0
        ticket_medio_anterior = round(total_anterior / recibos_anterior, 2) if recibos_anterior > 0 else 0

        # Alertas e insights básicos
        alertas = []
        insights = []
        
        if total_anterior > 0:
            variacao_volume = ((total_atual - total_anterior) / total_anterior) * 100
            if variacao_volume < -20:
                alertas.append(f"Volume caiu {abs(variacao_volume):.1f}% em relação ao período anterior")
            elif variacao_volume > 20:
                insights.append(f"Volume aumentou {variacao_volume:.1f}% em relação ao período anterior")

        if picos_heatmap:
            pico_principal = picos_heatmap[0]
            insights.append(f"Horário de maior movimento: {pico_principal['dia_semana']} às {pico_principal['hora']}")

        if produtos_mais_vendidos:
            produto_principal = produtos_mais_vendidos[0]
            insights.append(f"Produto mais vendido: {produto_principal['produto']} ({produto_principal['quantidade']} unidades)")

        # 2. Gerar análise com IA automaticamente
        try:
            openai_integration = OpenAIIntegration()
            
            # Preparar dados para IA
            dados_para_ia = {
                "metricas": {
                    "atual": {
                        "total_vendas": round(total_atual, 2),
                        "numero_faturas": recibos_atual,
                        "itens_vendidos": itens_atual,
                        "ticket_medio": ticket_medio_atual
                    },
                    "anterior": {
                        "total_vendas": round(total_anterior, 2),
                        "numero_faturas": recibos_anterior,
                        "itens_vendidos": itens_anterior,
                        "ticket_medio": ticket_medio_anterior
                    }
                },
                "produtos_mais_vendidos": produtos_mais_vendidos[:5],
                "picos_movimento": picos_heatmap[:3],
                "alertas": alertas,
                "insights": insights
            }
            
            
            # Gerar análise com IA
            resultado_ia = openai_integration.analyze_with_openai(
                data=dados_para_ia,
                prompt=openai_integration.get_custom_prompt("vendas")
            )
            
            
            if resultado_ia["success"]:
                analise_completa = resultado_ia["analysis"]
                tipo_analise = "analise_ia"
            else:
                analise_completa = f"Erro na análise de IA: {resultado_ia['error']}"
                tipo_analise = "erro_ia"
                
        except Exception as e:
            analise_completa = f"Erro ao gerar análise de IA: {str(e)}"
            tipo_analise = "erro_ia"

        # 3. Montar resposta final
        resultado = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "parametros": {
                "nif": nif,
                "filial": filial,
                "periodo": periodo,
                "periodo_nome": parse_periodo(periodo)
            },
            "dados": {
                "resumo_geral": {
                    "nif": nif,
                    "filial": filial,
                    "periodo": parse_periodo(periodo),
                    "periodo_num": periodo,
                    "data_inicio": str(data_inicio),
                    "data_fim": str(data_fim),
                    "data_inicio_anterior": str(data_inicio_anterior),
                    "data_fim_anterior": str(data_fim_anterior),
                    "ultima_atualizacao": current_time_str(),
                    "dias_periodo": (data_fim - data_inicio).days + 1,
                    "dias_periodo_anterior": (data_fim_anterior - data_inicio_anterior).days + 1
                },
                "metricas_principais": {
                    "total_vendas": calcular_variacao_dados(total_atual, total_anterior),
                    "numero_faturas": calcular_variacao_dados(recibos_atual, recibos_anterior),
                    "itens_vendidos": calcular_variacao_dados(itens_atual, itens_anterior),
                    "ticket_medio": calcular_variacao_dados(ticket_medio_atual, ticket_medio_anterior)
                },
                "vendas_por_hora": comparativo_por_hora,
                "produtos_mais_vendidos": produtos_mais_vendidos,
                "picos_movimento": picos_heatmap,
                "vendas_ultimos_7_dias": vendas_ultimos_7_dias,
                "filiais": filiais_info,
                "alertas": alertas,
                "insights": insights,
                "estatisticas_detalhadas": {
                    "total_volume_periodo": round(total_atual, 2),
                    "total_faturas_periodo": recibos_atual,
                    "total_itens_periodo": itens_atual,
                    "media_faturas_por_dia": round(recibos_atual / max(1, (data_fim - data_inicio).days), 2),
                    "media_volume_por_fatura": round(total_atual / max(1, recibos_atual), 2),
                    "produto_mais_vendido": produtos_mais_vendidos[0] if produtos_mais_vendidos else None,
                    "horario_mais_movimentado": picos_heatmap[0] if picos_heatmap else None
                },
                "comparacao_periodos": {
                    "periodo_atual": {
                        "nome": parse_periodo(periodo),
                        "data_inicio": str(data_inicio),
                        "data_fim": str(data_fim),
                        "dias": (data_fim - data_inicio).days + 1,
                        "total_volume": round(total_atual, 2),
                        "total_faturas": recibos_atual,
                        "total_itens": itens_atual,
                        "ticket_medio": round(total_atual / max(1, recibos_atual), 2)
                    },
                    "periodo_anterior": {
                        "nome": parse_periodo(periodo),
                        "data_inicio": str(data_inicio_anterior),
                        "data_fim": str(data_fim_anterior),
                        "dias": (data_fim_anterior - data_inicio_anterior).days + 1,
                        "total_volume": round(total_anterior, 2),
                        "total_faturas": recibos_anterior,
                        "total_itens": itens_anterior,
                        "ticket_medio": round(total_anterior / max(1, recibos_anterior), 2)
                    },
                    "variacoes": {
                        "volume": {
                            "valor": round(total_atual - total_anterior, 2),
                            "percentual": round(((total_atual - total_anterior) / total_anterior) * 100, 2) if total_anterior > 0 else 0,
                            "tendencia": "crescimento" if total_atual > total_anterior else "queda" if total_atual < total_anterior else "estavel"
                        },
                        "faturas": {
                            "valor": recibos_atual - recibos_anterior,
                            "percentual": round(((recibos_atual - recibos_anterior) / recibos_anterior) * 100, 2) if recibos_anterior > 0 else 0,
                            "tendencia": "crescimento" if recibos_atual > recibos_anterior else "queda" if recibos_atual < recibos_anterior else "estavel"
                        },
                        "itens": {
                            "valor": itens_atual - itens_anterior,
                            "percentual": round(((itens_atual - itens_anterior) / itens_anterior) * 100, 2) if itens_anterior > 0 else 0,
                            "tendencia": "crescimento" if itens_atual > itens_anterior else "queda" if itens_atual < itens_anterior else "estavel"
                        },
                        "ticket_medio": {
                            "valor": round(ticket_medio_atual - ticket_medio_anterior, 2),
                            "percentual": round(((ticket_medio_atual - ticket_medio_anterior) / ticket_medio_anterior) * 100, 2) if ticket_medio_anterior > 0 else 0,
                            "tendencia": "crescimento" if ticket_medio_atual > ticket_medio_anterior else "queda" if ticket_medio_atual < ticket_medio_anterior else "estavel"
                        }
                    }
                }
            },
            "analise": {
                "conteudo": analise_completa,
                "timestamp": datetime.now().isoformat(),
                "tipo": tipo_analise,
                "observacao": "Análise gerada automaticamente com IA" if tipo_analise == "analise_ia" else "Erro na geração da análise"
            }
        }

        return jsonify(resultado), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500



@app.route("/api/analise-ia-completa", methods=["GET"])
@require_valid_token
def analise_ia_completa():
    """
    Rota para análise IA completa - Gera TODOS os tipos de análise
    """
    try:
        # Obter parâmetros
        nif = request.args.get("nif")
        if not is_valid_nif(nif):
            return jsonify({"error": "NIF é obrigatório e deve conter apenas números"}), 400

        filial = request.args.get("filial", "").strip() or None
        
        try:
            periodo = int(request.args.get("periodo", "0"))
        except ValueError:
            return jsonify({"error": "Período inválido. Deve ser um número inteiro de 0 a 5."}), 400

        # Inicializar integração OpenAI
        openai_integration = OpenAIIntegration()
        
        # Tipos de análise disponíveis
        tipos_analise = ["vendas", "operacional", "financeiro", "marketing", "estratégico"]
        
        # Gerar todas as análises
        todas_analises = {}
        erros = []
        
        for tipo in tipos_analise:
            try:
                resultado = openai_integration.generate_insights(
                    nif=nif,
                    periodo=periodo,
                    filial=filial,
                    server_url="http://localhost:8000",
                    token=request.headers.get('Authorization', '').replace('Bearer ', ''),
                    tipo_analise=tipo
                )
                
                if resultado["success"]:
                    todas_analises[tipo] = {
                        "conteudo": resultado["analysis"]["analysis"] if resultado["analysis"]["success"] else resultado["analysis"]["error"],
                        "modelo": resultado["analysis"].get("model", "N/A"),
                        "tokens_usados": resultado["analysis"].get("usage", {}).get("total_tokens", "N/A"),
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    erros.append(f"Erro na análise {tipo}: {resultado['error']}")
                    
            except Exception as e:
                erros.append(f"Erro na análise {tipo}: {str(e)}")
        
        # Preparar resposta completa
        resposta = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "parametros": {
                "nif": nif,
                "filial": filial,
                "periodo": periodo,
                "periodo_nome": parse_periodo(periodo),
                "total_analises": len(todas_analises),
                "analises_com_erro": len(erros)
            },
            "analises": todas_analises,
            "estatisticas": {
                "periodo_analisado": parse_periodo(periodo),
                "filial_analisada": filial or "Todas",
                "timestamp_analise": datetime.now().isoformat(),
                "total_tokens_estimado": sum(analise.get("tokens_usados", 0) for analise in todas_analises.values() if isinstance(analise.get("tokens_usados"), int))
            }
        }
        
        if erros:
            resposta["erros"] = erros
        
        # Adicionar resumo executivo
        if todas_analises:
            try:
                # Gerar resumo executivo com base em todas as análises
                resumo_data = {
                    "analises_geradas": list(todas_analises.keys()),
                    "total_analises": len(todas_analises),
                    "periodo": parse_periodo(periodo),
                    "filial": filial or "Todas"
                }
                
                resumo_prompt = """Você é um analista executivo. Com base nas análises geradas, forneça um resumo executivo conciso com:

    📊 **Resumo Executivo**
    - Principais insights de todas as análises
    - Pontos críticos identificados
    - Recomendações prioritárias

    🎯 **Próximos Passos**
    - Ações imediatas recomendadas
    - Áreas de foco principal
    - Alertas importantes

    Use formatação clara e seja objetivo."""

                resumo_resultado = openai_integration.analyze_with_openai(
                    data=resumo_data,
                    prompt=resumo_prompt
                )
                
                if resumo_resultado["success"]:
                    resposta["resumo_executivo"] = {
                        "conteudo": resumo_resultado["analysis"],
                        "modelo": resumo_resultado.get("model", "N/A"),
                        "tokens_usados": resumo_resultado.get("usage", {}).get("total_tokens", "N/A")
                    }
                    
            except Exception as e:
                resposta["erro_resumo"] = f"Erro ao gerar resumo executivo: {str(e)}"
        
        return jsonify(resposta), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500


@app.route("/api/gerar-analises-cache", methods=["POST"])
@require_valid_token
def gerar_analises_cache():
    """
    Gera análises automaticamente baseado no período e salva no cache
    - Período 0 (hoje): gera diariamente
    - Período 2 (semana): gera semanalmente  
    - Período 3 (mês): gera mensalmente
    """
    try:
        # Obter parâmetros
        nif = request.args.get("nif")
        if not is_valid_nif(nif):
            return jsonify({"error": "NIF é obrigatório e deve conter apenas números"}), 400

        filial = request.args.get("filial", "").strip() or None
        forcar_geracao = request.args.get("forcar", "false").lower() == "true"
        
        # Determinar período baseado na data atual
        hoje = date.today()
        dia_semana = hoje.weekday()  # 0=Segunda, 6=Domingo
        dia_mes = hoje.day
        
        # Lógica de períodos automáticos
        periodos_para_gerar = []
        
        # Período 0 (hoje) - sempre gera
        periodos_para_gerar.append(0)
        
        # Período 2 (semana) - gera apenas às segundas (início da semana)
        if dia_semana == 0:  # Segunda-feira
            periodos_para_gerar.append(2)
        
        # Período 3 (mês) - gera apenas no primeiro dia do mês
        if dia_mes == 1:  # Primeiro dia do mês
            periodos_para_gerar.append(3)
        
        # Se forçar geração, incluir todos os períodos
        if forcar_geracao:
            periodos_para_gerar = [0, 1, 2, 3, 4, 5]
        
        # Inicializar integração OpenAI
        openai_integration = OpenAIIntegration()
        
        # Gerar análises para cada período
        resultados = {}
        erros = []
        
        for periodo in periodos_para_gerar:
            try:
                # Verificar se já existe no cache (exceto se forçar)
                cache_key = f"analise_ia:{nif}:{filial or 'todas'}:{periodo}"
                
                if not forcar_geracao and cache.get(cache_key):
                    resultados[periodo] = {
                        "status": "cache_hit",
                        "mensagem": f"Análise para período {periodo} já existe no cache",
                        "dados": cache.get(cache_key)
                    }
                    continue
                
                # Gerar análise
                resultado = openai_integration.generate_insights(
                    nif=nif,
                    periodo=periodo,
                    filial=filial,
                    server_url="http://localhost:8000",
                    token=request.headers.get('Authorization', '').replace('Bearer ', ''),
                    tipo_analise="vendas"
                )
                
                if resultado["success"]:
                    # Salvar no cache com timeout baseado no período
                    timeout_cache = {
                        0: 86400,  # 1 dia para hoje
                        1: 86400,  # 1 dia para ontem
                        2: 604800,  # 1 semana para semana
                        3: 2592000,  # 1 mês para mês
                        4: 2592000,  # 1 mês para trimestre
                        5: 31536000  # 1 ano para ano
                    }
                    
                    dados_cache = {
                        "analise": resultado["analysis"],
                        "dados_originais": resultado["original_data"],
                        "timestamp_geracao": datetime.now().isoformat(),
                        "periodo": periodo,
                        "nif": nif,
                        "filial": filial
                    }
                    
                    cache.set(cache_key, dados_cache, timeout=timeout_cache.get(periodo, 86400))
                    
                    resultados[periodo] = {
                        "status": "gerado",
                        "mensagem": f"Análise para período {periodo} gerada e salva no cache",
                        "dados": dados_cache,
                        "timeout_cache": timeout_cache.get(periodo, 86400)
                    }
                else:
                    erros.append(f"Erro na análise período {periodo}: {resultado['error']}")
                    
            except Exception as e:
                erros.append(f"Erro na análise período {periodo}: {str(e)}")
        
        # Preparar resposta
        resposta = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "parametros": {
                "nif": nif,
                "filial": filial,
                "forcar_geracao": forcar_geracao,
                "periodos_gerados": periodos_para_gerar
            },
            "resultados": resultados,
            "estatisticas": {
                "total_periodos": len(periodos_para_gerar),
                "gerados": len([r for r in resultados.values() if r["status"] == "gerado"]),
                "cache_hit": len([r for r in resultados.values() if r["status"] == "cache_hit"]),
                "erros": len(erros)
            }
        }
        
        if erros:
            resposta["erros"] = erros
        
        return jsonify(resposta), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500


@app.route("/api/obter-analise-cache", methods=["GET"])
@require_valid_token
def obter_analise_cache():
    """
    Obtém análise do cache baseado no período. Se não existir, gera automaticamente.
    """
    try:
        # Obter parâmetros
        nif = request.args.get("nif")
        if not is_valid_nif(nif):
            return jsonify({"error": "NIF é obrigatório e deve conter apenas números"}), 400

        filial = request.args.get("filial", "").strip() or None
        
        try:
            periodo = int(request.args.get("periodo", "0"))
        except ValueError:
            return jsonify({"error": "Período inválido. Deve ser um número inteiro de 0 a 5."}), 400

        # Buscar no cache
        cache_key = f"analise_ia:{nif}:{filial or 'todas'}:{periodo}"
        dados_cache = cache.get(cache_key)
        
        if dados_cache:
            return jsonify({
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "parametros": {
                    "nif": nif,
                    "filial": filial,
                    "periodo": periodo,
                    "periodo_nome": parse_periodo(periodo)
                },
                "analise": dados_cache["analise"],
                "dados_originais": dados_cache["dados_originais"],
                "metadata": {
                    "timestamp_geracao": dados_cache["timestamp_geracao"],
                    "fonte": "cache"
                }
            }), 200
        else:
            # Se não existe no cache, gerar automaticamente
            try:
                # Inicializar integração OpenAI
                openai_integration = OpenAIIntegration()
                
                # Gerar análise
                resultado = openai_integration.generate_insights(
                    nif=nif,
                    periodo=periodo,
                    filial=filial,
                    server_url="http://localhost:8000",
                    token=request.headers.get('Authorization', '').replace('Bearer ', ''),
                    tipo_analise="vendas"
                )
                
                if resultado["success"]:
                    # Salvar no cache com timeout baseado no período
                    timeout_cache = {
                        0: 86400,  # 1 dia para hoje
                        1: 86400,  # 1 dia para ontem
                        2: 604800,  # 1 semana para semana
                        3: 2592000,  # 1 mês para mês
                        4: 2592000,  # 1 mês para trimestre
                        5: 31536000  # 1 ano para ano
                    }
                    
                    dados_cache = {
                        "analise": resultado["analysis"],
                        "dados_originais": resultado["original_data"],
                        "timestamp_geracao": datetime.now().isoformat(),
                        "periodo": periodo,
                        "nif": nif,
                        "filial": filial
                    }
                    
                    cache.set(cache_key, dados_cache, timeout=timeout_cache.get(periodo, 86400))
                    
                    return jsonify({
                        "success": True,
                        "timestamp": datetime.now().isoformat(),
                        "parametros": {
                            "nif": nif,
                            "filial": filial,
                            "periodo": periodo,
                            "periodo_nome": parse_periodo(periodo)
                        },
                        "analise": dados_cache["analise"],
                        "dados_originais": dados_cache["dados_originais"],
                        "metadata": {
                            "timestamp_geracao": dados_cache["timestamp_geracao"],
                            "fonte": "gerado_automaticamente",
                            "timeout_cache": timeout_cache.get(periodo, 86400)
                        }
                    }), 200
                else:
                    return jsonify({
                        "success": False,
                        "error": f"Erro ao gerar análise: {resultado['error']}",
                        "timestamp": datetime.now().isoformat()
                    }), 500
                    
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Erro ao gerar análise automaticamente: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                }), 500

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500


@app.route("/api/limpar-cache-analises", methods=["DELETE"])
@require_valid_token
def limpar_cache_analises():
    """
    Limpa cache de análises para um NIF específico
    """
    try:
        nif = request.args.get("nif")
        if not is_valid_nif(nif):
            return jsonify({"error": "NIF é obrigatório e deve conter apenas números"}), 400

        filial = request.args.get("filial", "").strip() or None
        
        # Limpar cache para todos os períodos
        periodos = [0, 1, 2, 3, 4, 5]
        limpos = 0
        
        for periodo in periodos:
            cache_key = f"analise_ia:{nif}:{filial or 'todas'}:{periodo}"
            if cache.delete(cache_key):
                limpos += 1
                print(f"Cache limpo para NIF {nif}")
        return jsonify({
            "success": True,
            "mensagem": f"Cache limpo para NIF {nif}",
            "analises_limpas": limpos,
            "timestamp": datetime.now().isoformat()
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500


@app.route('/api/resumo-geral-ia', methods=['GET'])
@require_valid_token
def resumo_geral_ia():
    """
    Rota otimizada para IA que retorna dados estruturados para análise,
    utilizando a lógica de negócio centralizada.
    """
    try:
        # Obter parâmetros da requisição
        nif = request.args.get('nif', '').strip()
        filial = request.args.get('filial', '').strip() or None

        if not is_valid_nif(nif):
            return jsonify({'success': False, 'error': 'NIF inválido'}), 400

        try:
            periodo = int(request.args.get('periodo', '0'))
        except ValueError:
            return jsonify({'success': False, 'error': 'Período inválido'}), 400

        # Gerar dados usando a função centralizada
        resultado = gerar_dados_resumo_ia(nif, periodo, filial)
        
        if resultado.get("success"):
            # Em caso de sucesso, retorna os dados para a IA
            return jsonify(resultado["data"]), 200
        else:
            # Em caso de erro na lógica de negócio, retorna o erro
            return jsonify(resultado), 500

    except Exception as e:
        # Captura de erro genérico na rota
        return jsonify({
            "success": False,
            "error": f"Erro interno na rota: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
