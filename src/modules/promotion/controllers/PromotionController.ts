import { z } from 'zod';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import PromotionBotService from '../services/PromotionBotService';
import GroupService from '../../group/services/GroupService';
import { AppError, ValidationError } from '../../../shared/errors/AppError';
import { logger } from '../../../config/logger';
import { notifyWebhook } from '../../../shared/utils/webhook';

const runCampaignSchema = z.object({
  url: z.string({ required_error: 'URL é obrigatória' }).url({ message: 'URL inválida' }),
  groupIds: z.array(z.string()).optional(),
  maxGroups: z.number().int().positive().optional(),
  skipAntiDuplicateCheck: z.boolean().optional(),
  callToAction: z.string().trim().optional(),
});

const createGroupSchema = z.object({
  groupId: z.string({ required_error: 'groupId é obrigatório' }).trim().min(3),
  name: z.string({ required_error: 'name é obrigatório' }).trim().min(2),
  inviteLink: z.string().trim().url().optional(),
  category: z.string().trim().optional(),
  priority: z.number().int().optional(),
});

const updateGroupSchema = z.object({
  name: z.string().trim().min(2).optional(),
  inviteLink: z.string().trim().url().nullable().optional(),
  category: z.string().trim().nullable().optional(),
  priority: z.number().int().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']).optional(),
});

export class PromotionController {
  constructor(
    private readonly bot: PromotionBotService = new PromotionBotService(),
    private readonly groupService: GroupService = new GroupService(),
  ) {}

  public registerRoutes(app: FastifyInstance): void {
    app.post('/api/campaigns/run', this.runCampaign.bind(this));
    app.get('/api/groups', this.listGroups.bind(this));
    app.post('/api/groups', this.createGroup.bind(this));
    app.patch('/api/groups/:id', this.updateGroup.bind(this));
    app.delete('/api/groups/:id', this.deleteGroup.bind(this));
    app.get('/api/health', this.health.bind(this));
  }

  private async health(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send({
      ok: true,
      whatsappConnected: this.bot.whatsApp.isConnected(),
      timestamp: new Date().toISOString(),
    });
  }

  private async runCampaign(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = runCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        throw new ValidationError(issues);
      }

      await this.bot.ensureConnected();
      const summary = await this.bot.runCampaign(parsed.data);

      reply.status(200).send({ ok: true, summary });
    } catch (err) {
      this.handleError(err, reply, 'runCampaign');
    }
  }

  private async listGroups(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const groups = await this.groupService.listAll();
      reply.send({ ok: true, groups });
    } catch (err) {
      this.handleError(err, reply, 'listGroups');
    }
  }

  private async createGroup(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = createGroupSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        throw new ValidationError(issues);
      }
      const group = await this.groupService.create(parsed.data);
      reply.status(201).send({ ok: true, group });
    } catch (err) {
      this.handleError(err, reply, 'createGroup');
    }
  }

  private async updateGroup(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    try {
      const parsed = updateGroupSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        throw new ValidationError(issues);
      }
      const group = await this.groupService.update(req.params.id, parsed.data);
      reply.send({ ok: true, group });
    } catch (err) {
      this.handleError(err, reply, 'updateGroup');
    }
  }

  private async deleteGroup(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    try {
      await this.groupService.remove(req.params.id);
      reply.status(204).send();
    } catch (err) {
      this.handleError(err, reply, 'deleteGroup');
    }
  }

  private handleError(err: unknown, reply: FastifyReply, context: string): void {
    if (err instanceof AppError) {
      logger.warn({ context, status: err.statusCode, message: err.message }, 'Erro operacional');
      reply.status(err.statusCode).send({
        ok: false,
        error: err.message,
        code: err.name,
      });
      return;
    }
    logger.error({ err, context }, 'Erro não tratado no controller');
    notifyWebhook('ERROR', { context, message: (err as Error).message, stack: (err as Error).stack }).catch(() => void 0);
    reply.status(500).send({ ok: false, error: 'Erro interno do servidor' });
  }
}

export default PromotionController;
