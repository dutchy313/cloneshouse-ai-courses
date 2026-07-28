import { env } from '../config/env.js';
import { markPaymentAsPaid } from './payment.controller.js';
import { verifyPaystackSignature, verifyPaystackTransaction } from '../services/paystack.service.js';
import { getSquadWebhookSignature, verifySquadSignature } from '../services/squad.service.js';

export async function handlePaystackWebhook(req, res, next) {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-paystack-signature'];

    const isValid = verifyPaystackSignature(rawBody, signature);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid Paystack webhook signature' });
    }

    const event = req.body;

    if (event.event !== 'charge.success') {
      return res.status(200).json({ received: true, ignored: true });
    }

    const reference = event.data?.reference;

    if (!reference) {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: 'missing_reference'
      });
    }

    const verification = await verifyPaystackTransaction(reference);

    if (verification.data?.status !== 'success') {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: 'not_successful'
      });
    }

    await markPaymentAsPaid({
      reference,
      provider: 'paystack',
      rawEvent: {
        event,
        verification
      }
    });

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
}

function getSquadReference(event) {
  return (
    event.TransactionRef ||
    event.TransactionReference ||
    event.transaction_ref ||
    event.transaction_reference ||
    event.reference ||
    event.Body?.transaction_ref ||
    event.Body?.transaction_reference ||
    event.Body?.reference ||
    event.Body?.gateway_ref ||
    event.data?.transaction_ref ||
    event.data?.transaction_reference ||
    event.data?.reference ||
    event.data?.gateway_ref ||
    event.gateway_ref ||
    ''
  );
}

function getSquadStatus(event) {
  return (
    event.Body?.transaction_status ||
    event.Body?.status ||
    event.data?.transaction_status ||
    event.data?.status ||
    event.transaction_status ||
    event.status ||
    ''
  );
}

function getSquadEventName(event) {
  return event.Event || event.event || event.event_name || '';
}

export async function handleSquadWebhook(req, res, next) {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signature = getSquadWebhookSignature(req.headers);

    if (env.squadWebhookSignatureRequired) {
      const verification = verifySquadSignature({
        rawBody,
        parsedBody: req.body,
        signature
      });

      if (!verification.valid) {
        console.warn('Invalid Squad webhook signature', {
          reason: verification.reason,
          receivedHeaderNames: Object.keys(req.headers).filter((name) =>
            name.toLowerCase().includes('squad')
          ),
          hasSignature: Boolean(signature),
          rawBodyLength: rawBody.length
        });

        return res.status(401).json({
          message: 'Invalid Squad webhook signature',
          reason: verification.reason
        });
      }
    } else {
      console.warn('SQUAD WEBHOOK SIGNATURE CHECK DISABLED. Use only for sandbox/local testing.');
    }

    const event = req.body;
    const eventName = String(getSquadEventName(event)).toLowerCase();
    const reference = getSquadReference(event);
    const status = getSquadStatus(event);
    const normalizedStatus = String(status).toLowerCase();

    const isSuccessfulEvent =
      eventName === 'charge_successful' ||
      eventName === 'charge.success' ||
      ['success', 'successful', 'paid', 'completed'].includes(normalizedStatus);

    if (!reference) {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: 'missing_reference'
      });
    }

    if (!isSuccessfulEvent) {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: 'not_successful',
        eventName,
        status
      });
    }

    await markPaymentAsPaid({
      reference,
      provider: 'squad',
      rawEvent: event
    });

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
}