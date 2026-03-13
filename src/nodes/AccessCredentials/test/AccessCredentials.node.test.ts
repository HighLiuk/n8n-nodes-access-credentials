import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { AccessCredentials } from '../AccessCredentials.node';

describe('AccessCredentials Node', () => {
	let node: AccessCredentials;

	beforeEach(() => {
		node = new AccessCredentials();
	});

	describe('description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.displayName).toBe('Access Credentials');
			expect(node.description.name).toBe('accessCredentials');
			expect(node.description.version).toBe(1);
			expect(node.description.icon).toBe('fa:key');
		});

		it('should have a nodeCredentialType parameter with credentialsSelect type', () => {
			const param = node.description.properties.find(
				(p) => p.name === 'nodeCredentialType',
			);
			expect(param).toBeDefined();
			expect(param!.type).toBe('credentialsSelect');
			expect(param!.required).toBe(true);
		});

		it('should have a credentials proxy that intercepts find()', () => {
			const credentials = node.description.credentials!;

			// Real find on empty array should return undefined normally,
			// but our proxy returns a fallback object
			const result = credentials.find((c) => c.name === 'nonExistentType');
			expect(result).toEqual({ name: '__dynamic__', required: true });
		});

		it('should return actual credential if it exists in the array', () => {
			// Push a real entry to verify find() still works for real matches
			(node.description.credentials as any[]).push({
				name: 'testCred',
				required: true,
			});

			const result = node.description.credentials!.find(
				(c) => c.name === 'testCred',
			);
			expect(result).toEqual({ name: 'testCred', required: true });
		});

		it('should pass through other array methods via the proxy', () => {
			expect(node.description.credentials!.length).toBe(0);
			expect(Array.isArray(node.description.credentials)).toBe(true);
		});
	});

	describe('execute', () => {
		it('should output credential data for each input item', async () => {
			const mockCredentials = {
				user: 'admin',
				password: 's3cret',
				host: 'db.example.com',
				port: 3306,
			};

			const inputItems: INodeExecutionData[] = [
				{ json: { someField: 'value1' } },
				{ json: { someField: 'value2' } },
			];

			const executeFunctions = mock<IExecuteFunctions>();
			executeFunctions.getInputData.mockReturnValue(inputItems);
			executeFunctions.getNodeParameter.mockReturnValue('mySql');
			executeFunctions.getCredentials.mockResolvedValue(mockCredentials);

			const result = await node.execute.call(executeFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(2);

			expect(result[0][0].json).toEqual(mockCredentials);
			expect(result[0][0].pairedItem).toEqual({ item: 0 });

			expect(result[0][1].json).toEqual(mockCredentials);
			expect(result[0][1].pairedItem).toEqual({ item: 1 });
		});

		it('should call getCredentials with the selected credential type', async () => {
			const executeFunctions = mock<IExecuteFunctions>();
			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			executeFunctions.getNodeParameter.mockReturnValue('httpBasicAuth');
			executeFunctions.getCredentials.mockResolvedValue({ user: 'test', password: 'pass' });

			await node.execute.call(executeFunctions);

			expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('nodeCredentialType', 0);
			expect(executeFunctions.getCredentials).toHaveBeenCalledWith('httpBasicAuth');
		});

		it('should handle a single input item', async () => {
			const executeFunctions = mock<IExecuteFunctions>();
			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			executeFunctions.getNodeParameter.mockReturnValue('openAiApi');
			executeFunctions.getCredentials.mockResolvedValue({ apiKey: 'sk-123' });

			const result = await node.execute.call(executeFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ apiKey: 'sk-123' });
		});

		it.each([
			{
				type: 'httpBasicAuth',
				label: 'HTTP Basic Auth',
				credentials: { user: 'admin', password: 's3cret' },
			},
			{
				type: 'httpHeaderAuth',
				label: 'HTTP Header Auth',
				credentials: { name: 'Authorization', value: 'Bearer tok_123' },
			},
			{
				type: 'httpQueryAuth',
				label: 'HTTP Query Auth',
				credentials: { name: 'api_key', value: 'key_abc' },
			},
			{
				type: 'oAuth2Api',
				label: 'OAuth2 (generic)',
				credentials: {
					clientId: 'cid',
					clientSecret: 'csecret',
					accessToken: 'at_123',
					refreshToken: 'rt_456',
					tokenType: 'Bearer',
				},
			},
			{
				type: 'googleSheetsOAuth2Api',
				label: 'Google Sheets OAuth2',
				credentials: {
					clientId: 'gid',
					clientSecret: 'gsecret',
					accessToken: 'gat_789',
					refreshToken: 'grt_012',
				},
			},
			{
				type: 'openAiApi',
				label: 'OpenAI API',
				credentials: { apiKey: 'sk-openai-xyz' },
			},
			{
				type: 'mySql',
				label: 'MySQL',
				credentials: {
					host: 'db.example.com',
					port: 3306,
					database: 'mydb',
					user: 'root',
					password: 'dbpass',
				},
			},
			{
				type: 'redis',
				label: 'Redis',
				credentials: { host: 'localhost', port: 6379, password: 'redispass' },
			},
			{
				type: 'n8nApi',
				label: 'n8n API',
				credentials: { apiKey: 'n8n_key_abc', baseUrl: 'http://localhost:5678' },
			},
			{
				type: 'deepSeekApi',
				label: 'DeepSeek API',
				credentials: { apiKey: 'ds-key-123' },
			},
		])(
			'should correctly read $label ($type) credentials',
			async ({ type, credentials }) => {
				const executeFunctions = mock<IExecuteFunctions>();
				executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
				executeFunctions.getNodeParameter.mockReturnValue(type);
				executeFunctions.getCredentials.mockResolvedValue(credentials);

				const result = await node.execute.call(executeFunctions);

				expect(executeFunctions.getCredentials).toHaveBeenCalledWith(type);
				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toEqual(credentials);
			},
		);

		it('should propagate errors from getCredentials', async () => {
			const executeFunctions = mock<IExecuteFunctions>();
			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			executeFunctions.getNodeParameter.mockReturnValue('invalidType');
			executeFunctions.getCredentials.mockRejectedValue(
				new Error('Node does not have any credentials set'),
			);

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'Node does not have any credentials set',
			);
		});
	});
});
