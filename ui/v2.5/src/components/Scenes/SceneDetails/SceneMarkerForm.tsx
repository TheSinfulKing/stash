import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { Field, FieldProps, Form as FormikForm, Formik } from "formik";
import * as GQL from "src/core/generated-graphql";
import {
  useSceneMarkerCreate,
  useSceneMarkerUpdate,
  useSceneMarkerDestroy,
} from "src/core/StashService";
import {
  DurationInput,
  TagSelect,
  MarkerTitleSuggest,
} from "src/components/Shared";
import { getPlayerPosition } from "src/components/ScenePlayer/util";
import useToast from "src/hooks/Toast";
import {SceneCustomMarker} from "./SceneCustomMarker";

interface IFormFields {
  title: string;
  seconds: string;
  primaryTagId: string;
  tagIds: string[];
}

interface ISceneMarkerForm {
  sceneID: string;
  editingMarker?: GQL.SceneMarkerDataFragment;
  onClose: () => void;
}

export const SceneMarkerForm: React.FC<ISceneMarkerForm> = ({
  sceneID,
  editingMarker,
  onClose,
}) => {
  const [sceneMarkerCreate] = useSceneMarkerCreate();
  const [sceneMarkerUpdate] = useSceneMarkerUpdate();
  const [sceneMarkerDestroy] = useSceneMarkerDestroy();
  const Toast = useToast();

  const [formValues, setFormValues] = useState({
    title: editingMarker?.title ?? "",
    seconds: (
      editingMarker?.seconds ?? Math.round(getPlayerPosition() ?? 0)
    ).toString(),
    primaryTagId: editingMarker?.primary_tag.id ?? "",
    tagIds: editingMarker?.tags.map((tag) => tag.id) ?? [],
  });

  const onSubmit = (values: IFormFields) => {
    const variables: GQL.SceneMarkerUpdateInput | GQL.SceneMarkerCreateInput = {
      title: values.title,
      seconds: parseFloat(values.seconds),
      scene_id: sceneID,
      primary_tag_id: values.primaryTagId,
      tag_ids: values.tagIds,
    };
    if (!editingMarker) {
      sceneMarkerCreate({ variables })
        .then(onClose)
        .catch((err) => Toast.error(err));
    } else {
      const updateVariables = variables as GQL.SceneMarkerUpdateInput;
      updateVariables.id = editingMarker!.id;
      sceneMarkerUpdate({ variables: updateVariables })
        .then(onClose)
        .catch((err) => Toast.error(err));
    }
  };

  const onDelete = () => {
    if (!editingMarker) return;

    sceneMarkerDestroy({ variables: { id: editingMarker.id } })
      .then(onClose)
      .catch((err) => Toast.error(err));
  };
  const renderTitleField = (fieldProps: FieldProps<string>) => (
    <MarkerTitleSuggest
      initialMarkerTitle={fieldProps.field.value}
      onChange={(query: string) =>
        fieldProps.form.setFieldValue("title", query)
      }
    />
  );

  const renderSecondsField = (fieldProps: FieldProps<string>) => (
    <DurationInput
      onValueChange={(s) => {
        fieldProps.form.setFieldValue("seconds", s);
        formValues.seconds = s?.toString() ?? formValues.seconds.toString();
      }}
      onReset={() => {
        fieldProps.form.setFieldValue(
          "seconds",
          Math.round(getPlayerPosition() ?? 0)
        );
        formValues.seconds = Math.round(getPlayerPosition() ?? 0).toString();
      }}
      numericValue={Number.parseInt(fieldProps.field.value ?? "0", 10)}
      mandatory
    />
  );

  /*
      SEX ACT - Blowjob - 12
      SEX ACT - Handjob - 8
      ORIENTATION - Horizontal Video - 5
      ORIENTATION - Vertical Video - 6
      MISC - POV - 105
      SEX ACT - Reverse Cowgirl - 25
      SEX ACT - Missionary - 17
      SEX ACT - Cowgirl - 27
      MISC - Kneeling - 106
      SEX ACT - Doggystyle - 38
      SEX ACT - CUMSHOT - 15
      SEX ACT - CUMSHOT - Small - 219
      SEX ACT - CUMSHOT - BIG - 42
      SEX ACT - CUMSHOT - Cum In Mouth - 14
      SEX ACT - CUMSHOT - Cum In Mouth - Open - 218
      SEX ACT - CUMSHOT - PullOut - 19
      SEX ACT - CUMSHOT - Facial - 20
      SEX ACT - CUMSHOT - Creampie - 23
      SEX ACT - CUMSHOT - Spurt - 53
      SEX ACT - CUMSHOT - Cum On Tits - 22
      SEX ACT - CUMSHOT - Cum On Ass - 184
      SEX ACT - CUMSHOT - Cum On Body - 193
  */

  const handleCustomMarkerBJ = () => {
    let arr = formValues.tagIds;
    arr.push("12") 
    const newValues = {
      title: "Blowjob",
      seconds: formValues.seconds,
      primaryTagId: "12", // Blowjob id
      tagIds: arr
    };
    setFormValues(newValues);
  };

  const handleCustomMarkerHJ = () => {
    let arr = formValues.tagIds;
    arr.push("8") 
    const newValues = {
      title: "Handjob",
      seconds: formValues.seconds,
      primaryTagId: "8",
      tagIds: arr
    };
    setFormValues(newValues);
  };

  const handleCustomMarkerCowgirl = () => {
    let arr = formValues.tagIds;
    arr.push("27") 
    const newValues = {
      title: "Cowgirl",
      seconds: formValues.seconds,
      primaryTagId: "27",
      tagIds: arr, 
    };
    setFormValues(newValues);
  };

  const handleCustomMarkerReverseCowgirl = () => {
    let arr = formValues.tagIds;
    arr.push("25") 
    const newValues = {
      title: "Reverse Cowgirl",
      seconds: formValues.seconds,
      primaryTagId: "25",
      tagIds: arr
    };
    setFormValues(newValues);
  };

  const handleCustomMarkerDoggystyle = () => {
    let arr = formValues.tagIds;
    arr.push("38") 
    const newValues = {
      title: "Doggystyle",
      seconds: formValues.seconds,
      primaryTagId: "38",
      tagIds: arr
    };
    setFormValues(newValues);
  };

  const handleCustomMarkerMissionary = () => {
    let arr = formValues.tagIds;
    arr.push("17") 
    const newValues = {
      title: "Missionary",
      seconds: formValues.seconds,
      primaryTagId: "17",
      tagIds: arr
    };
    setFormValues(newValues);
  };

  const handleCustomMarkerHoriz = () => {
    let arr = formValues.tagIds;
    arr.push("5") 
    const newValues = {
      title: formValues.title,
      seconds: formValues.seconds,
      primaryTagId: formValues.primaryTagId,
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerVert = () => {
    let arr = formValues.tagIds;
    arr.push("6") 
    const newValues = {
      title: formValues.title,
      seconds: formValues.seconds,
      primaryTagId: formValues.primaryTagId,
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerHorizVert = () => {
    let arr = formValues.tagIds;
    arr.push("5", "6") 
    const newValues = {
      title: formValues.title,
      seconds: formValues.seconds,
      primaryTagId: formValues.primaryTagId,
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerPOV = () => {
    let arr = formValues.tagIds;
    arr.push("105") 
    const newValues = {
      title: formValues.title,
      seconds: formValues.seconds,
      primaryTagId: formValues.primaryTagId,
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerKneeling = () => {
    let arr = formValues.tagIds;
    arr.push("106") 
    const newValues = {
      title: formValues.title,
      seconds: formValues.seconds,
      primaryTagId: formValues.primaryTagId,
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerCumshotSmall = () => {
    let arr = formValues.tagIds;
    arr.push("15", "219") 
    const newValues = {
      title: formValues.title,
      seconds: formValues.seconds,
      primaryTagId: formValues.primaryTagId,
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerCumshotBig = () => {
    let arr = formValues.tagIds;
    arr.push("15", "42") 
    const newValues = {
      title: formValues.title,
      seconds: formValues.seconds,
      primaryTagId: formValues.primaryTagId,
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerFacial = () => {
    let arr = formValues.tagIds;
    arr.push("20", "15") 
    const newValues = {
      title: "Facial",
      seconds: formValues.seconds,
      primaryTagId: "20",
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerCumInMouth = () => {
    let arr = formValues.tagIds;
    arr.push("218", "15") 
    const newValues = {
      title: "Cum In Mouth - Open",
      seconds: formValues.seconds,
      primaryTagId: "218",
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerCumOnTits = () => {
    let arr = formValues.tagIds;
    arr.push("22", "15") 
    const newValues = {
      title: "Cum on Tits",
      seconds: formValues.seconds,
      primaryTagId: "22",
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerCumSpurt = () => {
    let arr = formValues.tagIds;
    arr.push("53", "15") 
    const newValues = {
      title: "Cum Spurt",
      seconds: formValues.seconds,
      primaryTagId: "53",
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerCumOnAss = () => {
    let arr = formValues.tagIds;
    arr.push("184", "15", "19") 
    const newValues = {
      title: "Cum On Ass",
      seconds: formValues.seconds,
      primaryTagId: "184",
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerCumOnBody = () => {
    let arr = formValues.tagIds;
    arr.push("193", "15", "19") 
    const newValues = {
      title: "Cum On Body",
      seconds: formValues.seconds,
      primaryTagId: "193",
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const handleCustomMarkerCreampie = () => {
    let arr = formValues.tagIds;
    arr.push("23") 
    const newValues = {
      title: "Creampie",
      seconds: formValues.seconds,
      primaryTagId: "23",
      tagIds: arr
    };
    setFormValues(newValues)
  };

  const renderCustomMarkersField = () => (
    <div style={{display: 'grid', rowGap: '0.5em', height: '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001%'}}>
      <div className='item1'>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div
  onClick={() => handleCustomMarkerHoriz()}
>
  <SceneCustomMarker
  icon="horizontal"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerHorizVert()}
>
<SceneCustomMarker
  icon="horizvert"
  transform={''}
  paddingTop={'50%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerVert()} 
>
<SceneCustomMarker
  icon="vert"
  transform={'rotate(90deg)'}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
        </div>
      </div>
      <div className='item2'>
      <div style={{ display: "flex", justifyContent: "space-evenly" }}>
      <div
  onClick={() => handleCustomMarkerPOV()}
>
<SceneCustomMarker
  icon="pov"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerKneeling()}
>
<SceneCustomMarker
  icon="kneeling"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
      </div>
      </div>
      <div className='item3'>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
<div
  onClick={() => handleCustomMarkerBJ()}
>
<SceneCustomMarker
  icon="bj"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerHJ()}
>
<SceneCustomMarker
  icon="hj"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerCowgirl()}
>
<SceneCustomMarker
  icon="cg"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerReverseCowgirl()}
>
<SceneCustomMarker
  icon="rcg"
  transform={'scaleX(-1)'}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerDoggystyle()}
>
<SceneCustomMarker
  icon="doggy"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerMissionary()}
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
      <div className='item4'>
      <div style={{ display: "flex", justifyContent: "space-evenly" }}>
      <div
  onClick={() => handleCustomMarkerCumshotSmall()}
>
<SceneCustomMarker
  icon="csmall"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={'2%'}
  />
</div>
<div
  onClick={() => handleCustomMarkerCumshotBig()}
>
<SceneCustomMarker
  icon="cbig"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
      </div>
      </div>
      <div className='item5'>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div
  onClick={() => handleCustomMarkerFacial()}
>
<SceneCustomMarker
  icon="facial"
  transform={''}
  paddingTop={'0.5%'}
  paddingLeft={''}
  paddingRight={'1.5%'}
  />
</div>
<div
  onClick={() => handleCustomMarkerCumInMouth()}
>
<SceneCustomMarker
  icon="cim"
  transform={''}
  paddingTop={'2%'}
  paddingLeft={'0.5'}
  paddingRight={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerCumOnTits()}
>
<SceneCustomMarker
  icon="tits"
  transform={''}
  paddingTop={'2%'}
  paddingLeft={''}
  paddingRight={'1%'}
  />
</div>
<div
  onClick={() => handleCustomMarkerCumSpurt()}
>
<SceneCustomMarker
  icon="spurt"
  transform={''}
  paddingTop={'2%'}
  paddingLeft={''}
  paddingRight={''}
  />
</div>
<div
  onClick={() => handleCustomMarkerCumOnAss()}
>
<SceneCustomMarker
  icon="ass"
  transform={''}
  paddingTop={'2%'}
  paddingLeft={''}
  paddingRight={'1.75%'}
  />
</div>
<div
  onClick={() => handleCustomMarkerCumOnBody()}
>
<SceneCustomMarker
  icon="body"
  transform={''}
  paddingTop={'2%'}
  paddingLeft={''}
  paddingRight={'1%'}
  />
</div>
<div
  onClick={() => handleCustomMarkerCreampie()}
>
<SceneCustomMarker
  icon="cream"
  transform={''}
  paddingTop={'1.5%'}
  paddingLeft={''}
  paddingRight={'1.5%'}
  />
</div>
      </div>
      </div>
    </div>
  );

  const renderPrimaryTagField = (fieldProps: FieldProps<string>) => (
    <TagSelect
      onSelect={(tags) =>
        fieldProps.form.setFieldValue("primaryTagId", tags[0]?.id)
      }
      ids={fieldProps.field.value ? [fieldProps.field.value] : []}
      noSelectionString="Select/create tag..."
    />
  );

  const renderTagsField = (fieldProps: FieldProps<string[]>) => (
    <TagSelect
      isMulti
      onSelect={(tags) =>
        fieldProps.form.setFieldValue(
          "tagIds",
          tags.map((tag) => tag.id)
        )
      }
      ids={fieldProps.field.value}
      noSelectionString="Select/create tags..."
    />
  );

  return (
    <Formik enableReinitialize initialValues={formValues} onSubmit={onSubmit}>
      <FormikForm>
        <div>
          <Form.Group className="row">
            <Form.Label
              htmlFor="custommarkers"
              className="col-sm-3 col-md-2 col-xl-12 col-form-label"
            >
              Custom Markers
            </Form.Label>
            <div className="col-sm-2 col-xl-12" style={{width: '40%', paddingBottom: '2%'}}>
                  <Field name="seconds">{renderSecondsField}</Field>
                </div>
            <div className="col-sm-9 col-md-10 col-xl-12">
              <Field name="custommarkers">{renderCustomMarkersField}</Field>
            </div>
            <div className="buttons-container row">
            <div style={{height: '20%'}}>
                  em
              </div>

              <div style={{height: '50%', width: '4.5%'}}>
                  em
              </div>
              <div className="col d-flex" style={{paddingTop: '5%'}}>
            <Button variant="primary" type="submit">
              Submit
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              className="ml-2"
            >
              <FormattedMessage id="actions.cancel" />
            </Button>
            {editingMarker && (
              <Button
                variant="danger"
                className="ml-auto"
                onClick={() => onDelete()}
              >
                <FormattedMessage id="actions.delete" />
              </Button>
            )}
          </div>
        </div>
          </Form.Group>
          <Form.Group className="row">
            <Form.Label
              htmlFor="title"
              className="col-sm-3 col-md-2 col-xl-12 col-form-label"
            >
              Marker Title
            </Form.Label>
            <div className="col-sm-9 col-md-10 col-xl-12">
              <Field name="title">{renderTitleField}</Field>
            </div>
          </Form.Group>
          <Form.Group className="row">
            <Form.Label
              htmlFor="primaryTagId"
              className="col-sm-3 col-md-2 col-xl-12 col-form-label"
            >
              Primary Tag
            </Form.Label>
            <div className="col-sm-4 col-md-6 col-xl-12 mb-3 mb-sm-0 mb-xl-3">
              <Field name="primaryTagId">{renderPrimaryTagField}</Field>
            </div>
            <div className="col-sm-5 col-md-4 col-xl-12">
              <div className="row">
                <Form.Label
                  htmlFor="seconds"
                  className="col-sm-4 col-md-4 col-xl-12 col-form-label text-sm-right text-xl-left"
                >
                  Time
                </Form.Label>
                <div className="col-sm-8 col-xl-12">
                  <Field name="seconds">{renderSecondsField}</Field>
                </div>
              </div>
            </div>
          </Form.Group>
          <Form.Group className="row">
            <Form.Label
              htmlFor="tagIds"
              className="col-sm-3 col-md-2 col-xl-12 col-form-label"
            >
              Tags
            </Form.Label>
            <div className="col-sm-9 col-md-10 col-xl-12">
              <Field name="tagIds">{renderTagsField}</Field>
            </div>
          </Form.Group>
        </div>
        <div className="buttons-container row">
          <div className="col d-flex">
            <Button variant="primary" type="submit">
              Submit
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              className="ml-2"
            >
              <FormattedMessage id="actions.cancel" />
            </Button>
            {editingMarker && (
              <Button
                variant="danger"
                className="ml-auto"
                onClick={() => onDelete()}
              >
                <FormattedMessage id="actions.delete" />
              </Button>
            )}
          </div>
        </div>
      </FormikForm>
    </Formik>
  );
};
