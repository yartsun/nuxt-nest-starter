import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Opt a route out of the global JWT guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): string => {
  return context.switchToHttp().getRequest().user?.userId;
});
