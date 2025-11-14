import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { StripeService } from '../stripe/stripe.service';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Stripe webhook endpoint (excluded from Swagger)' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    try {
      if (!signature) {
        this.logger.error('Missing Stripe signature header');
        res.status(400).send('Missing Stripe signature');
        return;
      }

      // Get raw body for signature verification
      const rawBody = req.rawBody;
      if (!rawBody) {
        this.logger.error('Missing raw body for webhook verification');
        res.status(400).send('Missing request body');
        return;
      }

      // Verify webhook signature and construct event
      const event = await this.stripeService.constructWebhookEvent(rawBody, signature);

      // Handle the event
      await this.webhooksService.handleEvent(event);

      // Return 200 to acknowledge receipt
      res.status(200).json({ received: true });
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
}
