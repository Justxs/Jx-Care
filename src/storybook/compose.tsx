import type { Decorator } from '@storybook/react-native';
import type { ComponentType, ReactElement } from 'react';

/**
 * A tiny CSF composer for Jest: turns a story file's default export (meta) and one named export
 * into an element, with args, parameters, `render` and decorators applied the way Storybook does
 * (story decorators innermost, then the meta's, then the global ones outermost).
 */

type Args = Record<string, unknown>;

/** Loosely typed CSF, enough to compose any story file. */
type StoryContextLike = {
  id: string;
  name: string;
  title: string;
  args: Args;
  argTypes: Record<string, unknown>;
  parameters: Record<string, unknown>;
  globals: Record<string, unknown>;
  viewMode: 'story';
};

type RenderFn = (args: Args, context: StoryContextLike) => ReactElement | null;

export type CsfMeta = {
  title?: string;
  component?: ComponentType<Args>;
  args?: Args;
  argTypes?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  decorators?: Decorator[];
  render?: RenderFn;
};

export type CsfStory =
  | RenderFn
  | {
      name?: string;
      args?: Args;
      argTypes?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
      decorators?: Decorator[];
      render?: RenderFn;
    };

/** The named exports of a story file that are stories (everything but `default` and `__…`). */
export function storyEntries(module: Record<string, unknown>): [string, CsfStory][] {
  return Object.entries(module).filter(
    (entry): entry is [string, CsfStory] =>
      entry[0] !== 'default' &&
      !entry[0].startsWith('__') &&
      (typeof entry[1] === 'function' || (typeof entry[1] === 'object' && entry[1] !== null)),
  );
}

export function composeStory(
  meta: CsfMeta,
  story: CsfStory,
  exportName: string,
  globalDecorators: readonly Decorator[] = [],
): () => ReactElement {
  const s = typeof story === 'function' ? { render: story } : story;
  const title = meta.title ?? 'Untitled';
  const context: StoryContextLike = {
    id: `${title}--${exportName}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    name: s.name ?? exportName,
    title,
    args: { ...meta.args, ...s.args },
    argTypes: { ...meta.argTypes, ...s.argTypes },
    parameters: { ...meta.parameters, ...s.parameters },
    globals: {},
    viewMode: 'story',
  };

  const Component = meta.component;
  const render: RenderFn =
    s.render ??
    meta.render ??
    ((args) => {
      if (!Component) throw new Error(`${title} ${exportName}: no render and no meta.component`);
      return <Component {...args} />;
    });

  const decorators = [...(s.decorators ?? []), ...(meta.decorators ?? []), ...globalDecorators];
  type Inner = (update?: Partial<StoryContextLike>) => ReactElement | null;
  let inner: Inner = (update) => {
    const ctx = { ...context, ...update };
    return render(ctx.args, ctx);
  };
  for (const decorator of decorators) {
    const next = inner;
    // `<Story />` passes React props ({}), which merge in as an empty update.
    const Story = (update?: Partial<StoryContextLike>) => next(update);
    inner = (update) => {
      const ctx = { ...context, ...update };
      return (decorator as unknown as (s: typeof Story, c: StoryContextLike) => ReactElement)(
        Story,
        ctx,
      );
    };
  }
  const Composed = () => inner();
  return () => <Composed />;
}
