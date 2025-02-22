import React, { useContext, useMemo, useRef, useState } from 'react';
import { createForm } from '@formily/core';
import {
  SchemaOptionsContext,
  Schema,
  useFieldSchema,
  observer,
  SchemaExpressionScopeContext,
  FormProvider,
  ISchema,
  useField,
  useForm,
  RecursionField,
} from '@formily/react';
import {
  useSchemaPath,
  SchemaField,
  useDesignable,
  removeSchema,
  updateSchema,
} from '../';
import get from 'lodash/get';
import { Button, Dropdown, Menu, Modal, Select, Space, Switch } from 'antd';
import { MenuOutlined, DragOutlined } from '@ant-design/icons';
import cls from 'classnames';
import { FormDialog, FormLayout } from '@formily/antd';
import './style.less';
import AddNew from '../add-new';
import { DraggableBlockContext } from '../../components/drag-and-drop';
import { isGridRowOrCol } from '../grid';
import constate from 'constate';
import { useEffect } from 'react';
import { uid } from '@formily/shared';
import { getSchemaPath } from '../../components/schema-renderer';
import { RandomNameContext } from '.';
import {
  useCollectionContext,
  useCollectionsContext,
  useDisplayedMapContext,
} from '../../constate';
import SwitchMenuItem from '../../components/SwitchMenuItem';
import { DragHandle } from '../../components/Sortable';
import { set } from 'lodash';

export const FieldDesignableBar = observer((props) => {
  const field = useField();
  const { schema, deepRemove, refresh } = useDesignable();
  const [visible, setVisible] = useState(false);
  const { dragRef } = useContext(DraggableBlockContext);
  const randomName = useContext(RandomNameContext);
  const displayed = useDisplayedMapContext();
  const fieldName = schema['x-component-props']?.['fieldName'];
  const { getField } = useCollectionContext();
  const { getFieldsByCollection } = useCollectionsContext();

  const collectionField = getField(fieldName);

  console.log({ collectionField });

  const realField = field
    .query(field.address.concat(randomName, fieldName))
    .take();

  return (
    <div className={cls('designable-bar', { active: visible })}>
      <span
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={cls('designable-bar-actions', { active: visible })}
      >
        <Space size={2}>
          <AddNew.FormItem defaultAction={'insertAfter'} ghost />
          <DragHandle />
          <Dropdown
            placement={'bottomRight'}
            trigger={['hover']}
            visible={visible}
            onVisibleChange={(visible) => {
              setVisible(visible);
            }}
            overlay={
              <Menu>
                <Menu.Item
                  key={'update'}
                  onClick={async () => {
                    const values = await FormDialog('自定义字段名称', () => {
                      return (
                        <FormLayout layout={'vertical'}>
                          <SchemaField
                            schema={{
                              type: 'object',
                              properties: {
                                fieldName: {
                                  type: 'string',
                                  title: '原字段名称',
                                  'x-read-pretty': true,
                                  'x-decorator': 'FormItem',
                                  'x-component': 'Input',
                                },
                                title: {
                                  type: 'string',
                                  title: '自定义名称',
                                  'x-decorator': 'FormItem',
                                  'x-component': 'Input',
                                },
                              },
                            }}
                          />
                        </FormLayout>
                      );
                    }).open({
                      initialValues: {
                        fieldName: collectionField?.uiSchema?.title,
                        title: schema['title'],
                      },
                    });
                    const title = values.title || null;
                    field
                      .query(field.address.concat(randomName, fieldName))
                      .take((f) => {
                        f.title = title || collectionField?.uiSchema?.title;
                      });
                    schema['title'] = title;
                    await updateSchema({
                      key: schema['key'],
                      title,
                    });
                  }}
                >
                  自定义字段名称
                </Menu.Item>
                {collectionField?.interface === 'linkTo' && (
                  <Menu.Item>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      标签字段{' '}
                      <Select
                        value={
                          schema?.['x-component-props']?.['fieldNames']?.[
                            'label'
                          ]
                        }
                        placeholder={'默认为 ID 字段'}
                        onChange={async (value) => {
                          set(
                            schema['x-component-props'],
                            'fieldNames.label',
                            value,
                          );
                          refresh();
                          const fieldNames = {
                            label: value,
                            value:
                              get(
                                schema['x-component-props'],
                                'fieldNames.value',
                              ) || 'id',
                          };
                          // realField.componentProps.fieldNames = fieldNames;
                          await updateSchema({
                            key: schema['key'],
                            'x-component-props': {
                              fieldNames,
                            },
                          });
                          // await service.refresh();
                        }}
                        bordered={false}
                        size={'small'}
                        style={{ marginLeft: 16, minWidth: 120 }}
                        options={getFieldsByCollection(collectionField.target)
                          .filter((f) => f?.uiSchema?.title)
                          .map((field) => ({
                            label: field?.uiSchema?.title || field.name,
                            value: field.name,
                          }))}
                      />
                    </div>
                  </Menu.Item>
                )}
                <Menu.Item
                  style={{ minWidth: 150 }}
                  onClick={async () => {
                    const values = await FormDialog('编辑描述', () => {
                      return (
                        <FormLayout layout={'vertical'}>
                          <SchemaField
                            schema={{
                              type: 'object',
                              properties: {
                                description: {
                                  type: 'string',
                                  'x-component': 'Input.TextArea',
                                },
                              },
                            }}
                          />
                        </FormLayout>
                      );
                    }).open({
                      initialValues: {
                        description: schema['description'],
                      },
                    });
                    const description = values.description || null;
                    realField.description =
                      description || collectionField?.uiSchema?.description;
                    schema['description'] = description;
                    await updateSchema({
                      key: schema['key'],
                      description,
                    });
                  }}
                >
                  编辑描述
                </Menu.Item>
                <SwitchMenuItem
                  title={'必填'}
                  checked={schema.required as boolean}
                  onChange={(checked) => {
                    field
                      .query(field.address.concat(randomName, fieldName))
                      .take((f: any) => {
                        f.required = checked;
                        schema.required = checked;
                        updateSchema(schema);
                      });
                  }}
                />
                <Menu.Divider />
                <Menu.Item
                  key={'delete'}
                  onClick={async () => {
                    const removed = deepRemove();
                    const fieldName =
                      schema['x-component-props']?.['fieldName'];
                    console.log({ schema, removed, fieldName });
                    const last = removed.pop();
                    displayed.remove(fieldName);
                    await removeSchema(last);
                  }}
                >
                  隐藏
                </Menu.Item>
              </Menu>
            }
          >
            <MenuOutlined />
          </Dropdown>
        </Space>
      </span>
    </div>
  );
});
