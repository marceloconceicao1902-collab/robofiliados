import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { PlatformEnum, type Platform } from '../../../shared/interfaces';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { AffiliateApiError, ValidationError } from '../../../shared/errors/AppError';
import {
  calculateDiscountPercentage,
  isValidUrl,
} from '../../../shared/utils/helpers';
import type {
  IAffiliateLinkExtractor,
  IUrlShortener,
  IAffiliateService,
  PartialProductInfo,
} from '../interfaces';
import type { ProductInfo } from '../../../shared/interfaces';
import { generateProductHash } from '../../../shared/utils/helpers';

class TinyUrlShortener implements IUrlShortener {
  public async shorten(url: string): Promise<string> {
    try {
      const response = await axios.get(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
        { timeout: 10000 },
      );
      if (typeof response.data === 'string' && isValidUrl(response.data)) {
        return response.data;
      }
      logger.warn('TinyURL retornou resposta inválida, usando URL original');
      return url;
    } catch (error) {
      logger.warn({ err: error }, 'Erro ao encurtar URL com TinyURL, usando URL original');
      return url;
    }
  }
}

class NoopShortener implements IUrlShortener {
  public async shorten(url: string): Promise<string> {
    return url;
  }
}

export class ShopeeExtractor implements IAffiliateLinkExtractor {
  public readonly platform = PlatformEnum.SHOPEE;
  private readonly tag: string;

  constructor(tag: string = env.SHOPEE_AFFILIATE_TAG) {
    this.tag = tag;
  }

  public canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      return u.hostname.includes('shopee.');
    } catch {
      return false;
    }
  }

  public extractProductId(url: string): string | null {
    try {
      const u = new URL(url);
      const params = u.searchParams;
      const idFromParam = params.get('itemid') || params.get('id');
      if (idFromParam) return idFromParam;

      const pathParts = u.pathname.split(/[.-]/).filter(Boolean);
      for (const part of pathParts) {
        if (/^\d{5,}$/.test(part)) return part;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async convertToAffiliateLink(url: string): Promise<string> {
    if (!this.tag) {
      logger.warn('SHOPEE_AFFILIATE_TAG não configurada, link não convertido');
      return url;
    }
    try {
      const u = new URL(url);
      u.searchParams.set('affiliate_tag', this.tag);
      u.searchParams.set('aff_platform', 'api');
      return u.toString();
    } catch (error) {
      throw new AffiliateApiError('Erro ao converter link Shopee', 'SHOPEE', error);
    }
  }

  public async fetchProductDetails(url: string): Promise<PartialProductInfo> {
    try {
      const { data } = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      const $ = cheerio.load(data);

      let title = $('meta[property="og:title"]').attr('content')?.trim();
      if (!title) {
        title = $('h1').first().text().trim() || $('title').text().trim();
      }

      let imageUrl = $('meta[property="og:image"]').attr('content');
      if (!imageUrl) {
        imageUrl = $('img').first().attr('src');
      }

      const description = $('meta[property="og:description"]').attr('content')?.trim();

      const prices = this.extractPricesFromHtml($);
      const productId = this.extractProductId(url);

      return {
        productId: productId ?? undefined,
        title: title || 'Produto Shopee',
        description,
        imageUrl,
        originalPrice: prices.originalPrice,
        discountPrice: prices.discountPrice,
      };
    } catch (error) {
      logger.warn({ err: error, url }, 'Erro ao extrair detalhes Shopee via scraping, tentando fallback');
      return this.fallbackFromMeta(url);
    }
  }

  private extractPricesFromHtml($: cheerio.CheerioAPI): { originalPrice?: number; discountPrice?: number } {
    const originalPrice = this.parsePriceText(
      $('._3n2N0O, ._2C8bS6, [class*="originPrice"], [class*="original"]').first().text(),
    );
    const discountPrice = this.parsePriceText(
      $('._3n2N0O + div, ._1dzuL9, [class*="currentPrice"], [class*="discountPrice"]').first().text() ||
        $('[class*="price"]').first().text(),
    );
    return { originalPrice, discountPrice };
  }

  private parsePriceText(text: string): number | undefined {
    if (!text) return undefined;
    const clean = text.replace(/[^\d,]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? undefined : num;
  }

  private async fallbackFromMeta(url: string): Promise<PartialProductInfo> {
    try {
      const { getLinkPreview } = await import('link-preview-js');
      const preview = await getLinkPreview(url, {
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
        timeout: 15000,
      });
      const title = 'title' in preview ? (preview as { title: string }).title : 'Produto Shopee';
      const imageUrl = 'images' in preview && Array.isArray((preview as { images: string[] }).images)
        ? (preview as { images: string[] }).images[0]
        : undefined;
      return {
        productId: this.extractProductId(url) ?? undefined,
        title: title || 'Produto Shopee',
        imageUrl,
      };
    } catch (err) {
      logger.error({ err, url }, 'Falha completa ao extrair dados Shopee');
      return {
        productId: this.extractProductId(url) ?? undefined,
        title: 'Produto Shopee',
      };
    }
  }
}

export class MercadoLivreExtractor implements IAffiliateLinkExtractor {
  public readonly platform = PlatformEnum.MERCADO_LIVRE;
  private readonly mbtc: string;
  private readonly http: AxiosInstance;

  constructor(mbtc: string = env.ML_AFFILIATE_TAG, accessToken: string = env.ML_ACCESS_TOKEN) {
    this.mbtc = mbtc;
    this.http = axios.create({
      baseURL: env.ML_SANDBOX ? 'https://api.mercadolibre.com' : 'https://api.mercadolibre.com',
      timeout: 15000,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  }

  public canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      return u.hostname.includes('mercadolivre.') || u.hostname.includes('mercadolibre.');
    } catch {
      return false;
    }
  }

  public extractProductId(url: string): string | null {
    try {
      const match = url.match(/ML[A-Z]?\d+/i);
      if (match) return match[0];
      const u = new URL(url);
      const parts = u.pathname.split(/[/_.]/).filter(Boolean);
      for (const part of parts) {
        if (/^ML[A-Z]?\d+$/i.test(part)) return part;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async convertToAffiliateLink(url: string): Promise<string> {
    if (!this.mbtc) {
      logger.warn('ML_AFFILIATE_TAG (mbtc) não configurada, link não convertido');
      return url;
    }
    try {
      const u = new URL(url);
      u.searchParams.set('mbtc', this.mbtc);
      return u.toString();
    } catch (error) {
      throw new AffiliateApiError('Erro ao converter link Mercado Livre', 'MERCADO_LIVRE', error);
    }
  }

  public async fetchProductDetails(url: string): Promise<PartialProductInfo> {
    const productId = this.extractProductId(url);

    if (productId && env.ML_ACCESS_TOKEN) {
      try {
        return await this.fetchViaApi(productId);
      } catch (error) {
        logger.warn({ err: error, productId }, 'Erro na API do ML, usando scraping/fallback');
      }
    }

    try {
      const { data } = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });
      const $ = cheerio.load(data);
      const title = $('meta[property="og:title"]').attr('content')?.trim() || $('h1').first().text().trim();
      const imageUrl = $('meta[property="og:image"]').attr('content') || $('img').first().attr('src');
      const description = $('meta[property="og:description"]').attr('content')?.trim();
      const discountPrice = this.parsePriceText($('.andes-money-amount__fraction').first().text());
      return {
        productId: productId ?? undefined,
        title: title || 'Produto Mercado Livre',
        description,
        imageUrl,
        discountPrice,
      };
    } catch (error) {
      logger.warn({ err: error, url }, 'Erro no scraping ML, usando link-preview');
      return this.fallbackFromMeta(url, productId);
    }
  }

  private async fetchViaApi(productId: string): Promise<PartialProductInfo> {
    const { data } = await this.http.get(`/items/${productId}`);
    const prices = data.prices?.prices || [];
    const original = prices.find((p: { type: string }) => p.type === 'standard')?.amount;
    const discount = data.price ?? prices.find((p: { type: string }) => p.type === 'promotion')?.amount;
    return {
      productId: data.id,
      title: data.title,
      imageUrl: data.pictures?.[0]?.secure_url || data.thumbnail,
      originalPrice: original ? Number(original) : undefined,
      discountPrice: discount ? Number(discount) : undefined,
      category: data.category_id,
      brand: data.attributes?.find((a: { id: string }) => a.id === 'BRAND')?.value_name,
    };
  }

  private parsePriceText(text: string): number | undefined {
    if (!text) return undefined;
    const clean = text.replace(/[^\d,]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? undefined : num;
  }

  private async fallbackFromMeta(url: string, productId: string | null): Promise<PartialProductInfo> {
    try {
      const { getLinkPreview } = await import('link-preview-js');
      const preview = await getLinkPreview(url, {
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
        timeout: 15000,
      });
      const title = 'title' in preview ? (preview as { title: string }).title : 'Produto Mercado Livre';
      const imageUrl = 'images' in preview && Array.isArray((preview as { images: string[] }).images)
        ? (preview as { images: string[] }).images[0]
        : undefined;
      return {
        productId: productId ?? undefined,
        title: title || 'Produto Mercado Livre',
        imageUrl,
      };
    } catch (err) {
      logger.error({ err, url }, 'Falha completa ao extrair dados ML');
      return {
        productId: productId ?? undefined,
        title: 'Produto Mercado Livre',
      };
    }
  }
}

export class AffiliateService implements IAffiliateService {
  private readonly extractors: IAffiliateLinkExtractor[];
  private readonly shortener: IUrlShortener;

  constructor() {
    this.extractors = [new ShopeeExtractor(), new MercadoLivreExtractor()];
    this.shortener = env.SHORTENER_PROVIDER === 'tinyurl' ? new TinyUrlShortener() : new NoopShortener();
  }

  public detectPlatform(url: string): Platform {
    for (const extractor of this.extractors) {
      if (extractor.canHandle(url)) {
        return extractor.platform;
      }
    }
    return PlatformEnum.GENERIC;
  }

  public async processLink(rawUrl: string): Promise<ProductInfo> {
    const trimmedUrl = rawUrl.trim();
    if (!isValidUrl(trimmedUrl)) {
      throw new ValidationError(`URL inválida: ${trimmedUrl}`);
    }

    const extractor = this.extractors.find((e) => e.canHandle(trimmedUrl));
    if (!extractor) {
      logger.warn({ url: trimmedUrl }, 'URL não pertence a Shopee/ML, tratando como genérico');
      return this.processGeneric(trimmedUrl);
    }

    logger.info({ url: trimmedUrl, platform: extractor.platform }, 'Processando link de afiliado');

    const [affiliateUrl, details] = await Promise.all([
      extractor.convertToAffiliateLink(trimmedUrl),
      extractor.fetchProductDetails(trimmedUrl),
    ]);

    const shortUrl = await this.shortener.shorten(affiliateUrl);

    const originalPrice = details.originalPrice;
    const discountPrice = details.discountPrice;
    const discountPercentage = calculateDiscountPercentage(
      originalPrice ?? 0,
      discountPrice ?? 0,
    ) ?? undefined;

    return {
      originalUrl: trimmedUrl,
      affiliateUrl,
      shortUrl,
      platform: extractor.platform,
      productId: details.productId,
      title: details.title?.trim() || 'Produto',
      description: details.description?.trim() || undefined,
      imageUrl: details.imageUrl,
      originalPrice,
      discountPrice,
      discountPercentage,
      category: details.category,
      brand: details.brand,
    };
  }

  private async processGeneric(url: string): Promise<ProductInfo> {
    let title = 'Produto em Oferta';
    let imageUrl: string | undefined;
    try {
      const { getLinkPreview } = await import('link-preview-js');
      const preview = await getLinkPreview(url, { timeout: 15000 });
      if ('title' in preview) title = (preview as { title: string }).title || title;
      if ('images' in preview) {
        const imgs = (preview as { images: string[] }).images;
        imageUrl = Array.isArray(imgs) ? imgs[0] : undefined;
      }
    } catch (err) {
      logger.warn({ err, url }, 'Falha no preview do link genérico');
    }
    const shortUrl = await this.shortener.shorten(url);
    return {
      originalUrl: url,
      affiliateUrl: url,
      shortUrl,
      platform: PlatformEnum.GENERIC,
      title,
      imageUrl,
    };
  }

  public getProductHash(originalUrl: string): string {
    return generateProductHash(originalUrl);
  }
}

export default AffiliateService;
