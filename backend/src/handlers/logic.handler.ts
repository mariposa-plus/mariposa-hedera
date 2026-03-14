export class LogicHandler {
  async execute(node: any, execution: any, inputs: Record<string, any>): Promise<any> {
    const config = node.data?.fullConfig?.component || node.data?.config || {};

    switch (node.type) {
      case 'condition': {
        const field = config.field || '';
        const operator = config.operator || 'equals';
        const value = config.value;
        const inputValue = inputs[field];

        let result = false;

        switch (operator) {
          case 'equals':
          case 'eq':
            result = inputValue == value;
            break;
          case 'not-equals':
          case 'neq':
            result = inputValue != value;
            break;
          case 'greater-than':
          case 'gt':
            result = Number(inputValue) > Number(value);
            break;
          case 'less-than':
          case 'lt':
            result = Number(inputValue) < Number(value);
            break;
          case 'greater-than-or-equal':
          case 'gte':
            result = Number(inputValue) >= Number(value);
            break;
          case 'less-than-or-equal':
          case 'lte':
            result = Number(inputValue) <= Number(value);
            break;
          case 'contains':
            result = String(inputValue).includes(String(value));
            break;
          case 'not-contains':
            result = !String(inputValue).includes(String(value));
            break;
          default:
            result = false;
        }

        return {
          success: true,
          result,
          field,
          operator,
          expectedValue: value,
          actualValue: inputValue,
        };
      }

      case 'data-transform':
        return {
          success: true,
          ...inputs,
          transformed: true,
          timestamp: new Date().toISOString(),
        };

      case 'loop': {
        const items = inputs.items || config.items || [];
        const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null;
        return {
          success: true,
          currentItem: firstItem,
          index: 0,
          totalItems: Array.isArray(items) ? items.length : 0,
        };
      }

      case 'delay': {
        const delayMs = config.delayMs || config.delay || 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return {
          success: true,
          resumedAt: new Date().toISOString(),
          delayMs,
        };
      }

      default:
        return { success: true, nodeType: node.type, message: 'Handler not implemented' };
    }
  }
}

export const logicHandler = new LogicHandler();
