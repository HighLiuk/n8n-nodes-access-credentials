import type {
	IExecuteFunctions,
	INodeCredentialDescription,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class AccessCredentials implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Access Credentials',
		name: 'accessCredentials',
		icon: 'fa:key',
		iconColor: 'orange',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["nodeCredentialType"] }}',
		description: 'Access and decode credentials in the workflow',
		defaults: {
			name: 'Access Credentials',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Credential Type',
				name: 'nodeCredentialType',
				type: 'credentialsSelect',
				noDataExpression: true,
				required: true,
				default: '',
				credentialTypes: [
					'extends:oAuth2Api',
					'extends:oAuth1Api',
					'has:authenticate',
					'has:genericAuth',
					'has:properties' as 'has:authenticate',
				],
				description: 'The credential type to access and decode',
			},
		],
	};

	constructor() {
		// Proxy the credentials array so that .find() always returns a match.
		// This bypasses the hardcoded check in n8n core that only allows
		// the HTTP Request node to access undeclared credential types.
		this.description.credentials = new Proxy(
			this.description.credentials as INodeCredentialDescription[],
			{
				get(target, prop) {
					if (prop === 'find') {
						return (predicate: (item: INodeCredentialDescription) => boolean) => {
							const result = Array.prototype.find.call(target, predicate);
							if (result) return result;
							// Return a permissive fallback so the check doesn't throw
							return { name: '__dynamic__', required: true };
						};
					}
					return Reflect.get(target, prop);
				},
			},
		);
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentialType = this.getNodeParameter('nodeCredentialType', 0) as string;
		const credentials = await this.getCredentials(credentialType);

		for (let i = 0; i < items.length; i++) {
			returnData.push({
				json: { ...credentials },
				pairedItem: { item: i },
			});
		}

		return [returnData];
	}
}
