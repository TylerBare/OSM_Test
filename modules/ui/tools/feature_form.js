import { dispatch as d3_dispatch } from 'd3-dispatch';
import { uiCmd } from '../cmd.js';
import { uiTooltip } from '../tooltip.js';

export function uiToolFeatureForm(context) {
  const l10n = context.systems.l10n;
  const ui = context.systems.ui;

  let _wrap;

  let tool = {
    id: 'feature_form',
    label: l10n.t('toolbar.feature_form'),
    showFeatureForm: showFeatureForm
  };

  let _tooltip = null;

  function update() {
    if (!_wrap) return;

    let formButton = _wrap.selectAll('.feature-form')
      .data([0]);

    let formButtonEnter = formButton.enter()
      .append('button')
      .on('click', () => {
        context.form_opened = !context.form_opened;
        showFeatureForm();
        toggleButtonClass(formButtonEnter);
      })
      .attr('class', 'bar-button feature-form')
      .attr('tabindex', -1)
      .text('Feature Form');

    formButton.merge(formButtonEnter);
  }

  function toggleButtonClass(button) {
    button.classed('form_active', !button.classed('form_active'));
  }

  tool.install = (selection) => {
    _wrap = selection
      .append('div')
      .style('display', 'flex');

    update();
  };

  tool.uninstall = function () {
    _wrap = null;
  };

  function showFeatureForm() {
    console.log(context.form_opened);
    console.log(context.form_opened);
    const container = document.createElement('div');
    container.setAttribute('class', 'feature-form-container');

    const header = document.createElement('div');
    header.setAttribute('class','header fillL');

    const title = document.createElement('h3');

    const title_text = document.createElement('span');
    title_text.setAttribute('class', 'localized-text');
    title_text.textContent = 'Feature Form';

    title.appendChild(title_text);
    header.appendChild(title);
    container.appendChild(header);


    //create form
    const form_list = document.createElement('div');
    form_list.setAttribute('class', 'form_list');

    const name_form = document.createElement('div');
    name_form.setAttribute('class', 'name-form');

    const form_title = document.createElement('div');
    form_title.setAttribute('class', 'title-container');

    const text = document.createElement('h3');
    text.setAttribute('class', 'form-text');
    text.textContent = 'Name';

    form_title.appendChild(text);
    name_form.appendChild(form_title);

    const input_div = document.createElement('div');
    input_div.setAttribute('class', 'input-container');

    const input = document.createElement('input');
    input.setAttribute('class', 'input-form');
    input.setAttribute('placeholder', 'Enter a name');

    input_div.appendChild(input);
    name_form.appendChild(input_div);

    form_list.appendChild(name_form);
    container.appendChild(form_list);






    // const emailLabel = document.createElement('label');
    // emailLabel.textContent = 'Email:';
    // const emailInput = document.createElement('input');
    // emailInput.setAttribute('type', 'email');
    // emailInput.setAttribute('name', 'email');
    // emailLabel.appendChild(emailInput);

    // const submitButton = document.createElement('button');
    // submitButton.setAttribute('type', 'submit');
    // submitButton.textContent = 'Submit';

    // form.appendChild(nameLabel);
    // form.appendChild(emailLabel);
    // form.appendChild(submitButton);

    // form.addEventListener('submit', (event) => {
    //   event.preventDefault();

    //   const formData = new FormData(form);
    //   const name = formData.get('name');
    //   const email = formData.get('email');

    //   console.log('Name:', name);
    //   console.log('Email:', email);

    //   form.reset();
    // });

    // form_div.appendChild(form);

    // Append the form to the container
    // container.appendChild(form_div);

    // Create and append the tags list
    const tagsContainer = document.createElement('div');
    tagsContainer.setAttribute('class', 'tags-container');
    const tagsHeader = document.createElement('h3');
    tagsHeader.textContent = 'Tags:';
    tagsContainer.appendChild(tagsHeader);

    Object.entries(context.tags).forEach(([key, value]) => {
      const tagDiv = document.createElement('div');
      tagDiv.textContent = `${key}: ${value}`;
      tagDiv.setAttribute('class', 'tag');
      tagsContainer.appendChild(tagDiv);
    });

    container.appendChild(tagsContainer);

    // Show the content in the sidebar
    ui.sidebar.expand();
    ui.sidebar.showContent(container);
  }

  return tool;
}
