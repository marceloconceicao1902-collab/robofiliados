import type { Group } from '@prisma/client';
import { GroupStatusEnum, type GroupStatus } from '../../../shared/interfaces';
import { prisma } from '../../../database/prisma';
import { logger } from '../../../config/logger';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { env } from '../../../config/env';

export class GroupService {
  public async listActive(max?: number): Promise<Group[]> {
    const take = max ?? env.SEND_MAX_GROUPS_PER_CAMPAIGN;
    const groups = await prisma.group.findMany({
      where: { status: GroupStatusEnum.ACTIVE },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take,
    });
    logger.debug({ total: groups.length }, 'Grupos ativos carregados');
    return groups;
  }

  public async listAll(): Promise<Group[]> {
    return prisma.group.findMany({ orderBy: [{ priority: 'desc' }, { name: 'asc' }] });
  }

  public async getById(id: string): Promise<Group | null> {
    return prisma.group.findUnique({ where: { id } });
  }

  public async getByGroupId(groupId: string): Promise<Group | null> {
    return prisma.group.findUnique({ where: { groupId } });
  }

  public async create(data: {
    groupId: string;
    name: string;
    inviteLink?: string;
    category?: string;
    priority?: number;
  }): Promise<Group> {
    if (!data.groupId?.trim()) {
      throw new ValidationError('groupId é obrigatório');
    }
    if (!data.name?.trim()) {
      throw new ValidationError('name é obrigatório');
    }

    const existing = await this.getByGroupId(data.groupId);
    if (existing) {
      throw new ValidationError('Já existe um grupo cadastrado com esse groupId');
    }

    const group = await prisma.group.create({
      data: {
        groupId: data.groupId.trim(),
        name: data.name.trim(),
        inviteLink: data.inviteLink?.trim() || null,
        category: data.category?.trim() || null,
        priority: data.priority ?? 0,
        status: GroupStatusEnum.ACTIVE,
      },
    });
    logger.info({ groupId: group.groupId, name: group.name }, 'Grupo cadastrado');
    return group;
  }

  public async update(
    id: string,
    data: Partial<{
      name: string;
      inviteLink: string | null;
      category: string | null;
      priority: number;
      status: GroupStatus;
    }>,
  ): Promise<Group> {
    const group = await this.getById(id);
    if (!group) {
      throw new NotFoundError(`Grupo ${id} não encontrado`);
    }
    const updated = await prisma.group.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.inviteLink !== undefined ? { inviteLink: data.inviteLink?.trim() || null } : {}),
        ...(data.category !== undefined ? { category: data.category?.trim() || null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });
    logger.info({ id }, 'Grupo atualizado');
    return updated;
  }

  public async remove(id: string): Promise<void> {
    const group = await this.getById(id);
    if (!group) {
      throw new NotFoundError(`Grupo ${id} não encontrado`);
    }
    await prisma.group.delete({ where: { id } });
    logger.info({ id, name: group.name }, 'Grupo removido');
  }

  public async markBanned(groupId: string, reason?: string): Promise<void> {
    const group = await this.getByGroupId(groupId);
    if (!group) return;
    await prisma.group.update({
      where: { id: group.id },
      data: { status: GroupStatusEnum.BANNED },
    });
    logger.warn({ groupId, reason }, 'Grupo marcado como banido');
  }
}

export default GroupService;
