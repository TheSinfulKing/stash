import React, { useEffect, useState } from "react";
import { Button, Form, Col, Row } from "react-bootstrap";
import { FormattedMessage, useIntl } from "react-intl";
import Mousetrap from "mousetrap";
import * as GQL from "src/core/generated-graphql";
import * as yup from "yup";
import { useImageUpdate } from "src/core/StashService";
import {
  PerformerSelect,
  TagSelect,
  StudioSelect,
  LoadingIndicator,
} from "src/components/Shared";
import { useToast } from "src/hooks";
import { FormUtils } from "src/utils";
import { useFormik } from "formik";
import { Prompt } from "react-router-dom";
import { RatingStars } from "src/components/Scenes/SceneDetails/RatingStars";
import { SceneCustomMarker } from "../../Scenes/SceneDetails/SceneCustomMarker";

interface IProps {
  image: GQL.ImageDataFragment;
  isVisible: boolean;
  onDelete: () => void;
}

export const ImageEditPanel: React.FC<IProps> = ({
  image,
  isVisible,
  onDelete,
}) => {
  const intl = useIntl();
  const Toast = useToast();

  // Network state
  const [isLoading, setIsLoading] = useState(false);

  const [updateImage] = useImageUpdate();

  const [customDirty, setCustomDirty] = useState(false);
  const [makeDirty, setMakeDirty] = useState(false);

  const schema = yup.object({
    title: yup.string().optional().nullable(),
    rating: yup.number().optional().nullable(),
    studio_id: yup.string().optional().nullable(),
    performer_ids: yup.array(yup.string().required()).optional().nullable(),
    tag_ids: yup.array(yup.string().required()).optional().nullable(),
  });

  const initialValues = {
    title: image.title ?? "",
    rating: image.rating ?? null,
    studio_id: image.studio?.id,
    performer_ids: (image.performers ?? []).map((p) => p.id),
    tag_ids: (image.tags ?? []).map((t) => t.id),
  };

  type InputValues = typeof initialValues;

  const formik = useFormik({
    initialValues,
    validationSchema: schema,
    onSubmit: (values) => onSave(getImageInput(values)),
  });

  useEffect(() => {
    if(formik.dirty || makeDirty) {
      setCustomDirty(true);
    }
    else {
      setCustomDirty(false);
    } 
  }, [formik]);

  function setRating(v: number) {
    formik.setFieldValue("rating", v);
  }

  useEffect(() => {
    if (isVisible) {
      Mousetrap.bind("s s", () => {
        formik.handleSubmit();
      });
      Mousetrap.bind("d d", () => {
        onDelete();
      });

      // numeric keypresses get caught by jwplayer, so blur the element
      // if the rating sequence is started
      Mousetrap.bind("r", () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        Mousetrap.bind("0", () => setRating(NaN));
        Mousetrap.bind("1", () => setRating(1));
        Mousetrap.bind("2", () => setRating(2));
        Mousetrap.bind("3", () => setRating(3));
        Mousetrap.bind("4", () => setRating(4));
        Mousetrap.bind("5", () => setRating(5));

        setTimeout(() => {
          Mousetrap.unbind("0");
          Mousetrap.unbind("1");
          Mousetrap.unbind("2");
          Mousetrap.unbind("3");
          Mousetrap.unbind("4");
          Mousetrap.unbind("5");
        }, 1000);
      });

      return () => {
        Mousetrap.unbind("s s");
        Mousetrap.unbind("d d");

        Mousetrap.unbind("r");
      };
    }
  });

  function getImageInput(input: InputValues): GQL.ImageUpdateInput {
    return {
      id: image.id,
      ...input,
    };
  }

  async function onSave(input: GQL.ImageUpdateInput) {
    setIsLoading(true);
    try {
      const result = await updateImage({
        variables: {
          input,
        },
      });
      if (result.data?.imageUpdate) {
        Toast.success({
          content: intl.formatMessage(
            { id: "toast.updated_entity" },
            { entity: intl.formatMessage({ id: "image" }).toLocaleLowerCase() }
          ),
        });
        formik.resetForm({ values: formik.values });
      }
    } catch (e) {
      Toast.error(e);
    }
    setIsLoading(false);
    setMakeDirty(false);
  }

  function renderTextField(field: string, title: string, placeholder?: string) {
    return (
      <Form.Group controlId={title} as={Row}>
        {FormUtils.renderLabel({
          title,
        })}
        <Col xs={9}>
          <Form.Control
            className="text-input"
            placeholder={placeholder ?? title}
            {...formik.getFieldProps(field)}
            isInvalid={!!formik.getFieldMeta(field).error}
          />
          <Form.Control.Feedback type="invalid">
            {formik.getFieldMeta(field).error}
          </Form.Control.Feedback>
        </Col>
      </Form.Group>
    );
  }

  if (isLoading) return <LoadingIndicator />;

  const getCurrentTagIds = () => {
    const values = formik.values;
    return values.tag_ids;
  }

  const handleCustomTags = (tag: string) => {
    const currentIds = getCurrentTagIds();

    switch(tag) {
      case 'organized-s':
        currentIds.push("345");
        break;
      case 'organized-spp':
        currentIds.push("346");
        break;
      case 'stashdbchecked': 
        currentIds.push("594");
        break;
      case 'horizontal': 
        currentIds.push("5");
        break;
      case 'horizvert':
        currentIds.push("5", "6");
        break;
      case 'vert':
        currentIds.push("6");
        break;
      case 'pornstar':
        currentIds.push("1");
        break;
      case 'amateur':
        currentIds.push("7");
        break;
      case 'white':
        currentIds.push("2");
        break;
      case 'black':
        currentIds.push("102");
        break;
      case 'lightskin':
        currentIds.push("244");
        break;
      case 'asian':
        currentIds.push("49");
        break;
      case 'indian':
        currentIds.push("189");
        break;
      case 'hispanic':
        currentIds.push("93");
        break;
      case 'middle-eastern':
        currentIds.push("67");
        break;
      case 'blonde':
        currentIds.push("9");
        break;
        case 'brunette':
          currentIds.push("18");
          break;
          case 'redhead':
            currentIds.push("28");
            break;
            case 'clothed':
              currentIds.push("75");
              break;
              case 'tclothed':
                currentIds.push("73");
                break;
                case 'nude':
                  currentIds.push("76");
                  break;
                  case 'tnude':
                    currentIds.push("72");
                    break;
                    case 'bikini':
                      currentIds.push("70");
                      break;
                      case 'tight':
                        currentIds.push("161");
                        break;
                        case 'bj':
                          currentIds.push("12");
                          break;
                          case 'hj':
                            currentIds.push("8");
                            break;
                            case 'cg':
                              currentIds.push("27");
                              break;
                              case 'rcg':
                                currentIds.push("25");
                                break;
                                case 'doggy':
                                  currentIds.push("38");
                                  break;
                                  case 'missionary':
                                    currentIds.push("17");
                                    break;
    }
    formik.setFieldValue("tag_ids", currentIds);
    setMakeDirty(true);
  }

  return (
    <div id="image-edit-details">
      <Prompt
        when={customDirty}
        message={intl.formatMessage({ id: "dialogs.unsaved_changes" })}
      />

      <Form noValidate onSubmit={formik.handleSubmit}>
        <div className="form-container row px-3 pt-3">
          <div className="col edit-buttons mb-3 pl-0">
            <Button
              className="edit-button"
              variant="primary"
              disabled={!customDirty}
              onClick={() => formik.submitForm()}
            >
              <FormattedMessage id="actions.save" />
            </Button>
            <Button
              className="edit-button"
              variant="danger"
              onClick={() => onDelete()}
            >
              <FormattedMessage id="actions.delete" />
            </Button>
          </div>
        </div>
        <div className="form-container row px-3">
          <div className="col-12 col-lg-6 col-xl-12">
            {renderTextField("title", intl.formatMessage({ id: "title" }))}
            <Form.Group controlId="rating" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "rating" }),
              })}
              <Col xs={9}>
                <RatingStars
                  value={formik.values.rating ?? undefined}
                  onSetRating={(value) =>
                    formik.setFieldValue("rating", value ?? null)
                  }
                />
              </Col>
            </Form.Group>

            <Form.Group controlId="studio" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "studio" }),
              })}
              <Col xs={9}>
                <StudioSelect
                  onSelect={(items) =>
                    formik.setFieldValue(
                      "studio_id",
                      items.length > 0 ? items[0]?.id : null
                    )
                  }
                  ids={formik.values.studio_id ? [formik.values.studio_id] : []}
                />
              </Col>
            </Form.Group>

            <Form.Group controlId="performers" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "performers" }),
                labelProps: {
                  column: true,
                  sm: 3,
                  xl: 12,
                },
              })}
              <Col sm={9} xl={12}>
                <PerformerSelect
                  isMulti
                  onSelect={(items) =>
                    formik.setFieldValue(
                      "performer_ids",
                      items.map((item) => item.id)
                    )
                  }
                  ids={formik.values.performer_ids}
                />
              </Col>
            </Form.Group>
            <Form.Group controlId="customtags" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "Custom Tags" }),
                labelProps: {
                  column: true,
                  sm: 3,
                  xl: 12,
                },
              })}
              <Col sm={9} xl={12}>
                <div style={{display: 'grid', rowGap: '0.5em', height: '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001%'}}>
                  <div className='item1'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                      <div onClick={() => handleCustomTags('organized-s')}>
                        <SceneCustomMarker 
                          icon="organizeds"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('organized-spp')}>
                        <SceneCustomMarker 
                          icon="organizedspp"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item2'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('horizontal')}>
                        <SceneCustomMarker 
                          icon="horizontal"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('horizvert')}>
                        <SceneCustomMarker 
                          icon="horizvert"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('vert')}>
                        <SceneCustomMarker 
                          icon="vert"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={'rotate(90deg)'}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item3'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('pornstar')}>
                        <SceneCustomMarker 
                          icon="pornstar"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('amateur')}>
                        <SceneCustomMarker 
                          icon="amateur"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item4'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('indian')}>
                        <SceneCustomMarker 
                          icon="indian"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('middle-eastern')}>
                        <SceneCustomMarker 
                          icon="middle-eastern"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('hispanic')}>
                        <SceneCustomMarker 
                          icon="hispanic"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    <div onClick={() => handleCustomTags('white')}>
                        <SceneCustomMarker 
                          icon="white"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('asian')}>
                        <SceneCustomMarker 
                          icon="asian"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('lightskin')}>
                        <SceneCustomMarker 
                          icon="lightskin"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('black')}>
                        <SceneCustomMarker 
                          icon="black"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item5'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('blonde')}>
                        <SceneCustomMarker 
                          icon="blonde"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('brunette')}>
                        <SceneCustomMarker 
                          icon="brunette"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('redhead')}>
                        <SceneCustomMarker 
                          icon="redhead"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item6'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('clothed')}>
                        <SceneCustomMarker 
                          icon="clothed"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('tclothed')}>
                        <SceneCustomMarker 
                          icon="tclothed"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('nude')}>
                        <SceneCustomMarker 
                          icon="nude"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('tnude')}>
                        <SceneCustomMarker 
                          icon="tnude"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item7'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('bikini')}>
                        <SceneCustomMarker 
                          icon="bikini"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('tight')}>
                        <SceneCustomMarker 
                          icon="tight"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item8'>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
<div
  onClick={() => handleCustomTags('bj')}
>
<SceneCustomMarker
  icon="bj"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('hj')}
>
<SceneCustomMarker
  icon="hj"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('cg')}
>
<SceneCustomMarker
  icon="cg"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('rcg')}
>
<SceneCustomMarker
  icon="rcg"
  transform={'scaleX(-1)'}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('doggy')}
>
<SceneCustomMarker
  icon="doggy"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('missionary')}
>
<SceneCustomMarker
  icon="missionary"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
</div>
                  </div>
                </div>
              </Col>
              <Button
              className="edit-button"
              variant="primary"
              disabled={!customDirty}
              onClick={() => formik.submitForm()}
            >
              <FormattedMessage id="actions.save" />
            </Button>
            </Form.Group>   
            <Form.Group controlId="tags" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "tags" }),
                labelProps: {
                  column: true,
                  sm: 3,
                  xl: 12,
                },
              })}
              <Col sm={9} xl={12}>
                <TagSelect
                  isMulti
                  onSelect={(items) =>
                    formik.setFieldValue(
                      "tag_ids",
                      items.map((item) => item.id)
                    )
                  }
                  ids={formik.values.tag_ids}
                />
              </Col>
            </Form.Group>
          </div>
        </div>
      </Form>
    </div>
  );
};
