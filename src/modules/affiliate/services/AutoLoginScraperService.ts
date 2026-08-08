import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../../../config/logger';
import type { PartialProductInfo } from '../interfaces';

export interface AutoLoginOptions {
  shopeeEmail?: string;
  shopeePassword?: string;
  mlEmail?: string;
  mlPassword?: string;
  category?: string;
  limit?: number;
}

export class AutoLoginScraperService {
  /**
   * Captura as melhores ofertas do dia automaticamente do Mercado Livre
   */
  public async fetchMercadoLivreTopDeals(keyword = 'ofertas do dia', limit = 5): Promise<PartialProductInfo[]> {
    try {
      logger.info({ keyword }, '🔎 Robô de Busca Automática: Capturando ofertas no Mercado Livre...');
      const searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(keyword)}`;
      const { data } = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      const $ = cheerio.load(data);
      const items: PartialProductInfo[] = [];

      $('.ui-search-result__wrapper, .poly-card').each((_, el) => {
        if (items.length >= limit) return;

        const title = $(el).find('.ui-search-item__title, .poly-component__title').text().trim();
        const link = $(el).find('a.ui-search-link, a.poly-component__title').attr('href');
        const imageUrl = $(el).find('img.ui-search-result-image__element, img.poly-component__picture').attr('src') ||
                         $(el).find('img').first().attr('data-src') || $(el).find('img').first().attr('src');
        const priceText = $(el).find('.andes-money-amount__fraction').first().text().trim();

        if (title && link) {
          const discountPrice = priceText ? parseFloat(priceText.replace(/[^\d]/g, '')) : undefined;
          items.push({
            productId: link.match(/MLB-?\d+/i)?.[0] || undefined,
            title,
            imageUrl,
            discountPrice,
          });
        }
      });

      logger.info({ count: items.length }, '✅ Mercado Livre: Ofertas em alta capturadas com sucesso');
      return items;
    } catch (error) {
      logger.error({ err: error }, 'Erro ao buscar ofertas no Mercado Livre');
      return [];
    }
  }

  /**
   * Captura as melhores ofertas do dia automaticamente da Shopee
   */
  public async fetchShopeeTopDeals(keyword = 'oferta relampago', limit = 5): Promise<PartialProductInfo[]> {
    try {
      logger.info({ keyword }, '🔎 Robô de Busca Automática: Capturando ofertas na Shopee...');
      const searchUrl = `https://shopee.com.br/search?keyword=${encodeURIComponent(keyword)}`;
      const { data } = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      const $ = cheerio.load(data);
      const items: PartialProductInfo[] = [];

      $('script').each((_, el) => {
        if (items.length >= limit) return;
        const html = $(el).html() || '';
        if (html.includes('itemid') && html.includes('name')) {
          try {
            const match = html.match(/\{"itemid":\d+,"shopid":\d+.*?\}/g);
            if (match) {
              for (const jsonStr of match) {
                if (items.length >= limit) break;
                try {
                  const obj = JSON.parse(jsonStr);
                  if (obj.name && obj.itemid) {
                    items.push({
                      productId: String(obj.itemid),
                      title: obj.name,
                      imageUrl: obj.image ? `https://down-br.img.susercontent.com/file/${obj.image}` : undefined,
                      discountPrice: obj.price ? obj.price / 100000 : undefined,
                    });
                  }
                } catch (_) {}
              }
            }
          } catch (_) {}
        }
      });

      logger.info({ count: items.length }, '✅ Shopee: Ofertas em alta capturadas com sucesso');
      return items;
    } catch (error) {
      logger.error({ err: error }, 'Erro ao buscar ofertas na Shopee');
      return [];
    }
  }

  /**
   * Executa a busca automática completa para ambas as plataformas
   */
  public async runAutoDiscovery(options: AutoLoginOptions): Promise<PartialProductInfo[]> {
    logger.info({ category: options.category || 'geral' }, '🚀 Iniciando varredura robótica de produtos em alta...');
    
    const category = options.category || 'ofertas';
    const [mlDeals, shopeeDeals] = await Promise.all([
      this.fetchMercadoLivreTopDeals(category, options.limit || 5),
      this.fetchShopeeTopDeals(category, options.limit || 5),
    ]);

    return [...mlDeals, ...shopeeDeals];
  }
}

export default AutoLoginScraperService;
