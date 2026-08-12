const Alexa = require('ask-sdk-core');
const atlasHome = require('../apl/atlas-home.json');

function supportsAPL(handlerInput) {
  return Boolean(
    handlerInput.requestEnvelope?.context?.System?.device?.supportedInterfaces?.['Alexa.Presentation.APL']
  );
}

function addAtlasHome(handlerInput, responseBuilder, statusText = 'ATLAS Echo Mode • Online') {
  if (!supportsAPL(handlerInput)) return responseBuilder;
  return responseBuilder.addDirective({
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: 'atlas-home',
    document: atlasHome,
    datasources: {
      payload: {
        statusText
      }
    }
  });
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const response = handlerInput.responseBuilder
      .speak('ATLAS está listo. Puedes decir dashboard, health, accounting o ride.')
      .reprompt('¿Qué módulo de ATLAS quieres abrir?');
    addAtlasHome(handlerInput, response);
    return response.getResponse();
  }
};

const ModuleIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ModuleIntent';
  },
  handle(handlerInput) {
    const slot = Alexa.getSlotValue(handlerInput.requestEnvelope, 'module') || 'dashboard';
    const normalized = slot.toLowerCase();
    const allowed = new Set(['dashboard', 'health', 'accounting', 'ride']);
    const moduleName = allowed.has(normalized) ? normalized : 'dashboard';
    const response = handlerInput.responseBuilder
      .speak(`Abriendo ${moduleName} en ATLAS.`)
      .reprompt('Puedes elegir otro módulo.');
    addAtlasHome(handlerInput, response, `ATLAS • ${moduleName.toUpperCase()}`);
    return response.getResponse();
  }
};

const UserEventHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent';
  },
  handle(handlerInput) {
    const moduleName = handlerInput.requestEnvelope.request?.arguments?.[0] || 'dashboard';
    const response = handlerInput.responseBuilder
      .speak(`Abriendo ${moduleName} en ATLAS.`)
      .reprompt('ATLAS sigue disponible.');
    addAtlasHome(handlerInput, response, `ATLAS • ${String(moduleName).toUpperCase()}`);
    return response.getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const response = handlerInput.responseBuilder
      .speak('Di dashboard, health, accounting o ride. También puedes tocar un módulo en la pantalla.')
      .reprompt('¿Qué módulo quieres abrir?');
    addAtlasHome(handlerInput, response);
    return response.getResponse();
  }
};

const ExitIntentHandler = {
  canHandle(handlerInput) {
    if (Alexa.getRequestType(handlerInput.requestEnvelope) !== 'IntentRequest') return false;
    return ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(
      Alexa.getIntentName(handlerInput.requestEnvelope)
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak('Cerrando ATLAS.').getResponse();
  }
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const response = handlerInput.responseBuilder
      .speak('No entendí ese comando. Di dashboard, health, accounting o ride.')
      .reprompt('¿Qué módulo quieres abrir?');
    addAtlasHome(handlerInput, response);
    return response.getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('ATLAS Echo error', error);
    return handlerInput.responseBuilder
      .speak('ATLAS encontró un error temporal. Inténtalo de nuevo.')
      .getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ModuleIntentHandler,
    UserEventHandler,
    HelpIntentHandler,
    ExitIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
