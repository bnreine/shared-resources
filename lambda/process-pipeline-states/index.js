import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { WebClient } from '@slack/web-api';

const PIPELINE_HAPPENINGS_CHANNEL = 'pipeline-happenings';
const PIPELINE_FAILURES_CHANNEL = 'pipeline-failures';
const SLACK_BOT_TOKEN_SECRET_NAME = process.env.SLACK_BOT_TOKEN_SECRET_NAME ?? 'slackBotToken';

const secretsManager = new SecretsManagerClient({});
let slackClient;

async function getSlackClient() {
  if (slackClient) {
    return slackClient;
  }

  const { SecretString } = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: SLACK_BOT_TOKEN_SECRET_NAME })
  );

  if (!SecretString) {
    throw new Error(`Secret ${SLACK_BOT_TOKEN_SECRET_NAME} has no string value`);
  }

  let token = SecretString;
  try {
    const parsed = JSON.parse(SecretString);
    token = parsed.slackBotToken ?? parsed.token ?? SecretString;
  } catch {
    // Secret stores the token as a plain string.
  }

  slackClient = new WebClient(token);
  return slackClient;
}

function formatPipelineMessage(message) {
  const detail = message.detail ?? {};
  const pipeline = detail.pipeline ?? 'unknown';
  const state = detail.state ?? 'unknown';
  const executionId = detail['execution-id'] ?? 'unknown';

  return {
    pipeline,
    state,
    text: `Pipeline *${pipeline}* execution ${state}\nExecution ID: \`${executionId}\``,
  };
}

export const handler = async (event) => {
  const slack = await getSlackClient();

  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);
    const { state, text } = formatPipelineMessage(message);
    const channel =
      state === 'FAILED' ? PIPELINE_FAILURES_CHANNEL : PIPELINE_HAPPENINGS_CHANNEL;

    await slack.chat.postMessage({
      channel,
      text,
    });
  }
};
