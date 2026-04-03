export type {
  FieldType,
  MappingFieldDef,
  TransformRule,
  TransformType,
  MappingConfigDef,
  MappingContext,
  MappingResult,
  MappingError,
  SourceAdapter,
} from './types.js';

export { applyMapping, getNestedValue, setNestedValue, getLeafPaths } from './engine.js';
export { applyTransform, getAvailableTransforms } from './transform.js';
export {
  registerProvider,
  getProvider,
  listProviders,
  heuristicMap,
  generateMappingSuggestions,
  suggestionsToMappings,
} from './ai-mapper.js';
export type { LlmProvider, MappingSuggestion } from './ai-mapper.js';
