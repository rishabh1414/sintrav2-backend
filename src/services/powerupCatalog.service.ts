import Ajv from "ajv";
import addFormats from "ajv-formats";
import { PowerupModel, PowerupDoc } from "../models/Powerup";

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  removeAdditional: false,
});
addFormats(ajv);

export type PowerupUpsertInput = {
  _id: string;
  name: string;
  description?: string;
  categories?: string[];
  tools?: string[];
  modelDefault?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  systemPrompt: string;
  enabled?: boolean;
  version?: number;
  workspaceId?: string; // optional for per-workspace overrides
};

export class PowerupCatalogService {
  /**
   * Returns the effective power-up definition:
   *  - workspace override if exists and enabled
   *  - otherwise global definition if enabled
   */
  static async getByKey(
    key: string,
    workspaceId?: string
  ): Promise<PowerupDoc | null> {
    if (workspaceId) {
      const ws = await PowerupModel.findOne({
        _id: key,
        workspaceId,
        deletedAt: null,
        enabled: true,
      }).lean();
      if (ws) return ws;
    }
    const global = await PowerupModel.findOne({
      _id: key,
      workspaceId: { $exists: false },
      deletedAt: null,
      enabled: true,
    }).lean();
    return global || null;
  }

  static async listCatalog(workspaceId?: string) {
    const [overrides, globals] = await Promise.all([
      workspaceId
        ? PowerupModel.find({
            workspaceId,
            deletedAt: null,
          })
            .sort({ _id: 1 })
            .lean()
        : [],
      PowerupModel.find({
        workspaceId: { $exists: false },
        deletedAt: null,
      })
        .sort({ _id: 1 })
        .lean(),
    ]);

    // If workspace provided, hide globals shadowed by overrides
    if (workspaceId) {
      const overriddenIds = new Set(overrides.map((o) => o._id));
      return [
        ...overrides,
        ...globals.filter((g) => !overriddenIds.has(g._id)),
      ];
    }
    return globals;
  }

  static async create(input: PowerupUpsertInput) {
    // Ensure uniqueness per (key, workspaceId, not deleted)
    const exists = await PowerupModel.findOne({
      _id: input._id,
      workspaceId: input.workspaceId ?? { $exists: false },
      deletedAt: null,
    });
    if (exists) {
      const err: any = new Error(
        "Power-up with this id already exists in this scope"
      );
      err.statusCode = 409;
      throw err;
    }

    const doc = await PowerupModel.create({
      _id: input._id,
      name: input.name,
      description: input.description,
      categories: input.categories ?? [],
      tools: input.tools ?? [],
      modelDefault: input.modelDefault,
      inputSchema: input.inputSchema,
      outputSchema: input.outputSchema,
      systemPrompt: input.systemPrompt,
      enabled: input.enabled ?? true,
      version: input.version ?? 1,
      workspaceId: input.workspaceId,
      deletedAt: null,
    });

    return doc.toObject();
  }

  static async update(
    id: string,
    updates: Partial<PowerupUpsertInput>,
    workspaceId?: string
  ) {
    const filter: any = { _id: id, deletedAt: null };
    if (workspaceId) filter.workspaceId = workspaceId;
    else filter.workspaceId = { $exists: false };

    const updated = await PowerupModel.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) {
      const err: any = new Error("Power-up not found");
      err.statusCode = 404;
      throw err;
    }
    return updated;
  }

  static async remove(id: string, workspaceId?: string) {
    const filter: any = { _id: id, deletedAt: null };
    if (workspaceId) filter.workspaceId = workspaceId;
    else filter.workspaceId = { $exists: false };

    const deleted = await PowerupModel.findOneAndUpdate(
      filter,
      { $set: { deletedAt: new Date(), enabled: false } },
      { new: true }
    ).lean();

    if (!deleted) {
      const err: any = new Error("Power-up not found");
      err.statusCode = 404;
      throw err;
    }
    return { ok: true };
  }

  /**
   * Compiles AJV validators from the stored JSON Schemas.
   * Use this when you want to validate inputs/outputs at runtime without Zod.
   */
  static compileValidators(pu: PowerupDoc) {
    const validateInput = pu.inputSchema ? ajv.compile(pu.inputSchema) : null;
    const validateOutput = pu.outputSchema
      ? ajv.compile(pu.outputSchema)
      : null;
    return { validateInput, validateOutput };
  }
}
