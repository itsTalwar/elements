import '@testing-library/jest-dom/extend-expect';

import { IHttpOperation } from '@stoplight/types';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'jest-fetch-mock';
import * as React from 'react';

import { httpOperation as multipartFormdataOperation } from '../../../__fixtures__/operations/multipart-formdata-post';
import { httpOperation as putOperation } from '../../../__fixtures__/operations/put-todos';
import { operation as basicOperation } from '../../../__fixtures__/operations/simple-get';
import { httpOperation as urlEncodedPostOperation } from '../../../__fixtures__/operations/urlencoded-post';
import { TryIt } from '../index';

function clickSend() {
  const button = screen.getByRole('button', { name: /send/i });
  userEvent.click(button);
}

describe('TryIt', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("Doesn't crash", () => {
    render(<TryIt httpOperation={basicOperation} />);
  });

  it('Makes the correct basic request', async () => {
    render(<TryIt httpOperation={basicOperation} />);

    const button = screen.getByRole('button', { name: /send/i });
    userEvent.click(button);

    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock).toBeCalledWith(
      'https://todos.stoplight.io/todos',
      expect.objectContaining({
        method: 'get',
      }),
    );
  });

  it('Displays response', async () => {
    fetchMock.mockResolvedValue(
      new Response('{}', {
        status: 200,
        statusText: 'OK',
        headers: [],
      }),
    );

    render(<TryIt httpOperation={basicOperation} />);

    let responseHeader = screen.queryByText('Response');
    expect(responseHeader).not.toBeInTheDocument();

    clickSend();

    responseHeader = await screen.findByText('Response');
    expect(responseHeader).toBeVisible();
  });

  it('Handles error', () => {});

  describe('Parameter Handling', () => {
    it('Hides panel when there are no parameters', () => {
      render(<TryIt httpOperation={basicOperation} />);

      let parametersHeader = screen.queryByText('Parameters');
      expect(parametersHeader).not.toBeInTheDocument();
    });

    it('Shows panel when there are parameters', () => {
      render(<TryIt httpOperation={putOperation} />);

      let parametersHeader = screen.queryByText('Parameters');
      expect(parametersHeader).toBeInTheDocument();
    });

    it('Displays types correctly', () => {
      render(<TryIt httpOperation={putOperation} />);

      const todoIdField = screen.getByLabelText('todoId') as HTMLInputElement;
      expect(todoIdField.placeholder).toMatch(/string/i);
    });

    it('Initializes parameters correctly', () => {
      render(<TryIt httpOperation={putOperation} />);

      // path param
      const completedField = screen.getByLabelText('completed');
      expect(completedField).toHaveValue('');

      // query params
      const limitField = screen.getByLabelText('limit');
      expect(limitField).toHaveValue('0');

      const typeField = screen.getByLabelText('type');
      expect(typeField).toHaveValue('something');

      const valueField = screen.getByLabelText('value');
      expect(valueField).toHaveValue('0');

      // header param

      const accountIdField = screen.getByLabelText('account-id') as HTMLInputElement;
      expect(accountIdField).toHaveValue('example id');
      expect(accountIdField.placeholder).toMatch(/account-id-default/i);

      const messageIdField = screen.getByLabelText('message-id');
      expect(messageIdField).toHaveValue('example value');
    });

    it('Passes all parameters to the request', async () => {
      render(<TryIt httpOperation={putOperation} />);

      // path param
      const todoIdField = screen.getByLabelText('todoId');
      await userEvent.type(todoIdField, '123');

      // query params
      const limitField = screen.getByLabelText('limit');
      await userEvent.selectOptions(limitField, '3');

      const typeField = screen.getByLabelText('type');
      await userEvent.selectOptions(typeField, 'another');

      // header param

      const accountIdField = screen.getByLabelText('account-id');
      await userEvent.type(accountIdField, ' 1999');

      const messageIdField = screen.getByLabelText('message-id-select');
      await userEvent.selectOptions(messageIdField, 'example 2');

      // click send
      clickSend();

      expect(fetchMock).toHaveBeenCalled();
      expect(fetchMock).toBeCalledWith(
        'https://todos.stoplight.io/todos/123?limit=3&value=0&type=another',
        expect.objectContaining({
          method: 'put',
          headers: {
            'account-id': 'example id 1999',
            'message-id': 'another example',
          },
        }),
      );
    });
  });

  describe('Form Data Body', () => {
    it('Hides panel when there are no parameters', () => {
      render(<TryIt httpOperation={basicOperation} />);

      let parametersHeader = screen.queryByText('Body');
      expect(parametersHeader).not.toBeInTheDocument();
    });

    it('Shows panel when there are parameters', () => {
      render(<TryIt httpOperation={urlEncodedPostOperation} />);

      let parametersHeader = screen.queryByText('Body');
      expect(parametersHeader).toBeInTheDocument();
    });

    it('Displays types correctly', () => {
      render(<TryIt httpOperation={urlEncodedPostOperation} />);

      const nameField = screen.getByRole('textbox', { name: 'name' }) as HTMLInputElement;
      expect(nameField.placeholder).toMatch(/string/i);

      const completedField = screen.getByRole('combobox', { name: 'completed' });
      expect(completedField).toBeInTheDocument();
    });

    const formDataCases: ReadonlyArray<[string, NewableFunction, IHttpOperation]> = [
      ['application/x-www-form-urlencoded', URLSearchParams, urlEncodedPostOperation],
      ['multipart/form-data', FormData, multipartFormdataOperation],
    ];

    describe.each(formDataCases)('Builds correct %p request', (name, prototype, fixture) => {
      let body: URLSearchParams | FormData;
      beforeAll(async () => {
        render(<TryIt httpOperation={fixture} />);

        // path param
        const nameField = screen.getByRole('textbox', { name: 'name' }) as HTMLInputElement;
        await userEvent.type(nameField, 'some-name');

        // click send
        clickSend();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        body = fetchMock.mock.calls[0][1]!.body as URLSearchParams | FormData;
        expect(body).toBeInstanceOf(prototype);
      });

      it('Sends user input', () => {
        expect(body.get('name')).toBe('some-name');
      });

      it('Includes untouched fields', () => {
        expect(body.get('completed')).toBe('');
      });

      it('Sets untouched enums to their first value', () => {
        expect(body.get('someEnum')).toBe('a');
      });
    });
  });
});