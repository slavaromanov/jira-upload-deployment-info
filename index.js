"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const request = require('request-promise-native');
const dateFormat = require('dateformat');
const token = require('@highwaythree/jira-github-actions-common');
function parseState(state) {
    switch (state.toLowerCase()) {
        case 'pending':
            return 'pending';
        case 'in_progress':
            return 'in_progress';
        case 'successful':
            return 'successful';
        case 'failed':
            return 'failed';
        case 'rolled_back':
            return 'rolled_back';
        default:
            return 'unknown';
    }
}
async function submitDeploymentInfo(accessToken) {
    const cloudInstanceBaseUrl = process.env.CLOUD_INSTANCE_BASE_URL;
    const cloudURL = new url_1.URL('/_edge/tenant_info', cloudInstanceBaseUrl);
    let cloudId = await request(cloudURL.href);
    cloudId = JSON.parse(cloudId);
    cloudId = cloudId.cloudId;
    const deploymentSequenceNumber = process.env.DEPLOYMENT_SEQUENCE_NUMBER;
    const updateSequenceNumber = process.env.UPDATE_SEQUENCE_NUMBER;
    let issueKeys = process.env.ISSUE_KEYS || '';
    const displayName = process.env.DISPLAY_NAME || '';
    const url = process.env.URL || '';
    const description = process.env.DESCRIPTION || '';
    let lastUpdated = process.env.LAST_UPDATED || dateFormat(new Date(), "yyyy-mm-dd'T'HH:MM:ss'Z'");
    const label = process.env.LABEL || '';
    const state = parseState(process.env.STATE || '');
    const pipelineId = process.env.PIPELINE_ID || '';
    const pipelineDisplayName = process.env.PIPELINE_DISPLAY_NAME || '';
    const pipelineUrl = process.env.PIPELINE_URL || '';
    const environmentId = process.env.ENVIRONMENT_ID || '';
    const environmentDisplayName = process.env.ENVIRONMENT_DISPLAY_NAME || '';
    const environmentType = process.env.ENVIRONMENT_TYPE || '';
    // console.log("lastUpdated: " + lastUpdated);
    const deployment = {
        schemaVersion: "1.0",
        deploymentSequenceNumber: deploymentSequenceNumber,
        updateSequenceNumber: updateSequenceNumber,
        issueKeys: issueKeys.split(','),
        displayName: displayName,
        url: url,
        description: description,
        lastUpdated: lastUpdated,
        label: label,
        state: state,
        pipeline: {
            id: pipelineId,
            displayName: pipelineDisplayName,
            url: pipelineUrl,
        },
        environment: {
            id: environmentId,
            displayName: environmentDisplayName,
            type: environmentType,
        }
    };
    let bodyData = {
        deployments: [deployment],
    };
    bodyData = JSON.stringify(bodyData);
    const options = {
        method: 'POST',
        url: "https://api.atlassian.com/jira/deployments/0.1/cloud/" + cloudId + "/bulk",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            Authorization: "Bearer " + accessToken,
        },
        body: bodyData,
    };
    let responseJson = await request(options);
    let response = JSON.parse(responseJson);
    if (response.rejectedDeployments && response.rejectedDeployments.length > 0) {
        const rejectedDeployment = response.rejectedDeployments[0];
        console.log("errors: ", rejectedDeployment.errors);
        let errors = rejectedDeployment.errors.map((error) => error.message).join(',');
        errors.substr(0, errors.length - 1);
        console.log("joined errors: ", errors);
        process.exit(1);
    }
    console.log(response);
}
exports.submitDeploymentInfo = submitDeploymentInfo;
(async function () {
    try {
        const clientId = process.env.JIRA_CLIENT_ID;
        const clientSecret = process.env.JIRA_SECRET;
        const accessTokenResponse = await token.getAccessToken(clientId, clientSecret);
        await submitDeploymentInfo(accessTokenResponse.access_token);
        // console.log("finished submitting deployment info");
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
    process.exit(0);
})();
