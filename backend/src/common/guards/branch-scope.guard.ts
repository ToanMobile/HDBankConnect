import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EmployeeRole } from '../../modules/employee/employee.entity';

interface ScopedRequest {
  user?: {
    role: EmployeeRole;
    branchId: string | null;
  };
  scopedBranchId?: string | null;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

/**
 * BranchScopeGuard — limits branch_manager role to their own branch data.
 * Injects scopedBranchId into request for downstream use.
 * super_admin and hr can access all branches.
 */
@Injectable()
export class BranchScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('FORBIDDEN');
    }

    if (user.role === EmployeeRole.BRANCH_MANAGER) {
      if (!user.branchId) {
        throw new ForbiddenException('BRANCH_NOT_ASSIGNED');
      }
      // Lock the query to this manager's branch
      request.scopedBranchId = user.branchId;
      // Also override query param if it conflicts
      if (request.query?.branch_id && request.query.branch_id !== user.branchId) {
        throw new ForbiddenException('BRANCH_ACCESS_DENIED');
      }
    } else {
      // super_admin / hr: no restriction
      request.scopedBranchId = request.query?.branch_id ?? null;
    }

    return true;
  }
}
