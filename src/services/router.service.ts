import { EmployeeModel } from "../models/Employee";

/**
 * RouterService
 * Decides which employee gets assigned to a capability.
 * Right now it's simple: pick first matching active employee.
 * You can upgrade later to embedding-based matching, load balancing, etc.
 */
export class RouterService {
  static async assignCapability(workspaceId: string, capabilityKey: string) {
    const employees = await EmployeeModel.find({
      workspaceId,
      active: true,
      capabilities: capabilityKey,
    })
      .sort({ createdAt: 1 })
      .limit(1)
      .lean();

    if (employees.length === 0) {
      return null; // fallback to default later if needed
    }

    return employees[0]._id;
  }

  static async listEmployees(workspaceId: string) {
    return EmployeeModel.find({ workspaceId, active: true }).lean();
  }

  static async registerEmployee(
    workspaceId: string,
    data: {
      _id: string;
      name: string;
      description?: string;
      capabilities: string[];
      tools?: string[];
    }
  ) {
    return EmployeeModel.create({
      ...data,
      workspaceId,
      tools: data.tools ?? [],
      active: true,
    });
  }
}
