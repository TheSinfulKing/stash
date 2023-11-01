import React, { useMemo } from "react";
import { Button, Form } from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { useFormik } from "formik";
import * as yup from "yup";
import * as GQL from "src/core/generated-graphql";
import {
  useSceneMarkerCreate,
  useSceneMarkerUpdate,
  useSceneMarkerDestroy,
} from "src/core/StashService";
import { DurationInput } from "src/components/Shared/DurationInput";
import {
  TagSelect,
  MarkerTitleSuggest,
  SelectObject,
} from "src/components/Shared/Select";
import { getPlayerPosition } from "src/components/ScenePlayer/util";
import { useToast } from "src/hooks/Toast";
import {SceneCustomMarker} from "./SceneCustomMarker";

interface ISceneMarkerForm {
  sceneID: string;
  marker?: GQL.SceneMarkerDataFragment;
  onClose: () => void;
}

export const SceneMarkerForm: React.FC<ISceneMarkerForm> = ({
  sceneID,
  marker,
  onClose,
}) => {
  const [sceneMarkerCreate] = useSceneMarkerCreate();
  const [sceneMarkerUpdate] = useSceneMarkerUpdate();
  const [sceneMarkerDestroy] = useSceneMarkerDestroy();
  const Toast = useToast();

  const isNew = marker === undefined;

  const schema = yup.object({
    title: yup.string().ensure(),
    seconds: yup.number().required(),
    primary_tag_id: yup.string().required(),
    tag_ids: yup.array(yup.string().required()).defined(),
  });

  // useMemo to only run getPlayerPosition when the input marker actually changes
  const initialValues = useMemo(
    () => ({
      title: marker?.title ?? "",
      seconds: marker?.seconds ?? Math.round(getPlayerPosition() ?? 0),
      primary_tag_id: marker?.primary_tag.id ?? "",
      tag_ids: marker?.tags.map((tag) => tag.id) ?? [],
    }),
    [marker]
  );

  type InputValues = yup.InferType<typeof schema>;

  const formik = useFormik<InputValues>({
    initialValues,
    validationSchema: schema,
    enableReinitialize: true,
    onSubmit: (values) => onSave(values),
  });

  async function onSave(input: InputValues) {
    try {
      if (isNew) {
        await sceneMarkerCreate({
          variables: {
            scene_id: sceneID,
            ...input,
          },
        });
      } else {
        await sceneMarkerUpdate({
          variables: {
            id: marker.id,
            scene_id: sceneID,
            ...input,
          },
        });
      }
    } catch (e) {
      Toast.error(e);
    } finally {
      onClose();
    }
  }

  async function onDelete() {
    if (isNew) return;

    try {
      await sceneMarkerDestroy({ variables: { id: marker.id } });
    } catch (e) {
      Toast.error(e);
    } finally {
      onClose();
    }
  }

  async function onSetPrimaryTagID(tags: SelectObject[]) {
    await formik.setFieldValue("primary_tag_id", tags[0]?.id);
    await formik.setFieldTouched("primary_tag_id", true);
  }

  const primaryTagId = formik.values.primary_tag_id;

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

      const setFormValues = (newValues: {title: string, seconds: number, primaryTagId: string, tagIds: string[]}) => {
        formik.setFieldValue("tag_ids", newValues.tagIds);
        formik.setFieldValue("seconds", newValues.seconds);
        formik.setFieldValue("primary_tag_id", newValues.primaryTagId);
        formik.setFieldValue("title", newValues.title);
      }

      const handleCustomMarkerBJ = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("12"))
          arr.push("12") 
        const newValues = {
          title: "Blowjob",
          seconds: formik.values.seconds,
          primaryTagId: "12", // Blowjob id
          tagIds: arr
        };
        setFormValues(newValues);
      };
    
      const handleCustomMarkerHJ = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("8"))
          arr.push("8") 
        const newValues = {
          title: "Handjob",
          seconds: formik.values.seconds,
          primaryTagId: "8",
          tagIds: arr
        };
        setFormValues(newValues);
      };
    
      const handleCustomMarkerCowgirl = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("27"))
          arr.push("27") 
        const newValues = {
          title: "Cowgirl",
          seconds: formik.values.seconds,
          primaryTagId: "27",
          tagIds: arr, 
        };
        setFormValues(newValues);
      };
    
      const handleCustomMarkerReverseCowgirl = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("25"))
          arr.push("25") 
        const newValues = {
          title: "Reverse Cowgirl",
          seconds: formik.values.seconds,
          primaryTagId: "25",
          tagIds: arr
        };
        setFormValues(newValues);
      };
    
      const handleCustomMarkerDoggystyle = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("38"))
          arr.push("38") 
        const newValues = {
          title: "Doggystyle",
          seconds: formik.values.seconds,
          primaryTagId: "38",
          tagIds: arr
        };
        setFormValues(newValues);
      };
    
      const handleCustomMarkerMissionary = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("17"))
          arr.push("17") 
        const newValues = {
          title: "Missionary",
          seconds: formik.values.seconds,
          primaryTagId: "17",
          tagIds: arr
        };
        setFormValues(newValues);
      };
    
      const handleCustomMarkerHoriz = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("5"))
          arr.push("5") 
        const newValues = {
          title: formik.values.title,
          seconds: formik.values.seconds,
          primaryTagId: formik.values.primary_tag_id,
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerVert = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("6"))
          arr.push("6") 
        const newValues = {
          title: formik.values.title,
          seconds: formik.values.seconds,
          primaryTagId: formik.values.primary_tag_id,
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerHorizVert = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("5"))
          arr.push("5") 
        if(!arr.includes("6"))
          arr.push("6") 
        const newValues = {
          title: formik.values.title,
          seconds: formik.values.seconds,
          primaryTagId: formik.values.primary_tag_id,
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerPOV = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("105"))
          arr.push("105") 
        const newValues = {
          title: formik.values.title,
          seconds: formik.values.seconds,
          primaryTagId: formik.values.primary_tag_id,
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerKneeling = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("106"))
          arr.push("106") 
        const newValues = {
          title: formik.values.title,
          seconds: formik.values.seconds,
          primaryTagId: formik.values.primary_tag_id,
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerCumshotSmall = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("15"))
          arr.push("15") 
        if(!arr.includes("219"))
          arr.push("219") 
        const newValues = {
          title: formik.values.title,
          seconds: formik.values.seconds,
          primaryTagId: formik.values.primary_tag_id,
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerCumshotBig = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("15"))
          arr.push("15") 
        if(!arr.includes("42"))
          arr.push("42") 
        const newValues = {
          title: formik.values.title,
          seconds: formik.values.seconds,
          primaryTagId: formik.values.primary_tag_id,
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerFacial = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("15"))
          arr.push("15") 
        if(!arr.includes("20"))
          arr.push("20")
        const newValues = {
          title: "Facial",
          seconds: formik.values.seconds,
          primaryTagId: "20",
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerCumInMouth = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("15"))
          arr.push("15") 
        if(!arr.includes("218"))
          arr.push("218")
        const newValues = {
          title: "Cum In Mouth - Open",
          seconds: formik.values.seconds,
          primaryTagId: "218",
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerCumOnTits = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("15"))
          arr.push("15") 
        if(!arr.includes("22"))
          arr.push("22")
        const newValues = {
          title: "Cum on Tits",
          seconds: formik.values.seconds,
          primaryTagId: "22",
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerCumSpurt = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("15"))
          arr.push("15") 
        if(!arr.includes("53"))
          arr.push("53")
        const newValues = {
          title: "Cum Spurt",
          seconds: formik.values.seconds,
          primaryTagId: "53",
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerCumOnAss = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("15"))
          arr.push("15") 
        if(!arr.includes("19"))
          arr.push("19")   
        if(!arr.includes("184"))
          arr.push("184")                 
        const newValues = {
          title: "Cum On Ass",
          seconds: formik.values.seconds,
          primaryTagId: "184",
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerCumOnBody = () => {
        let arr = formik.values.tag_ids;
        arr.push("193", "15", "19") 
        if(!arr.includes("15"))
          arr.push("15") 
        if(!arr.includes("19"))
          arr.push("19")   
        if(!arr.includes("193"))
          arr.push("193")  
        const newValues = {
          title: "Cum On Body",
          seconds: formik.values.seconds,
          primaryTagId: "193",
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerCreampie = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("23"))
          arr.push("23") 
        const newValues = {
          title: "Creampie",
          seconds: formik.values.seconds,
          primaryTagId: "23",
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerCIM = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("14"))
          arr.push("14") 
        const newValues = {
          title: "Cum In Mouth",
          seconds: formik.values.seconds,
          primaryTagId: "14",
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerSpitOnDick = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("250"))
          arr.push("250") 
        const newValues = {
          title: "Spit On Dick",
          seconds: formik.values.seconds,
          primaryTagId: "250",
          tagIds: arr
        };
        setFormValues(newValues)
      };
    
      const handleCustomMarkerTitjob = () => {
        let arr = formik.values.tag_ids;
        if(!arr.includes("35"))
          arr.push("35") 
        const newValues = {
          title: "Titjob",
          seconds: formik.values.seconds,
          primaryTagId: "35",
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
<div
  onClick={() => handleCustomMarkerSpitOnDick()}
>
<SceneCustomMarker
  icon="spit"
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
  onClick={() => handleCustomMarkerTitjob()}
>
<SceneCustomMarker
  icon="tits"
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
  icon="smallcumshot"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={'2%'}
  />
</div>
<div
  onClick={() => handleCustomMarkerCumshotBig()}
>
<SceneCustomMarker
  icon="bigcumshot"
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
  onClick={() => handleCustomMarkerCIM()}
>
<SceneCustomMarker
  icon="cimc"
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

  return (
    <Form noValidate onSubmit={formik.handleSubmit}>
      <div>
      <Form.Group className="row">
            <Form.Label
              htmlFor="custommarkers"
              className="col-sm-3 col-md-2 col-xl-12 col-form-label"
            >
              Custom Markers
            </Form.Label>
            <div className="col-sm-8 col-xl-12">
                <DurationInput
                  value={formik.values.seconds ?? 0}
                  setValue={(v) => formik.setFieldValue("seconds", v ?? null)}
                  onReset={() =>
                    formik.setFieldValue(
                      "seconds",
                      Math.round(getPlayerPosition() ?? 0)
                    )
                  }
                />
              </div>
            <div className="col-sm-9 col-md-10 col-xl-12" style={{paddingTop: '5%'}}>
              {renderCustomMarkersField()}
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
            {marker && (
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
          <Form.Label className="col-sm-3 col-md-2 col-xl-12 col-form-label">
            Marker Title
          </Form.Label>
          <div className="col-sm-9 col-md-10 col-xl-12">
            <MarkerTitleSuggest
              initialMarkerTitle={formik.values.title}
              onChange={(query: string) => formik.setFieldValue("title", query)}
            />
          </div>
        </Form.Group>
        <Form.Group className="row">
          <Form.Label className="col-sm-3 col-md-2 col-xl-12 col-form-label">
            Primary Tag
          </Form.Label>
          <div className="col-sm-4 col-md-6 col-xl-12 mb-3 mb-sm-0 mb-xl-3">
            <TagSelect
              onSelect={onSetPrimaryTagID}
              ids={primaryTagId ? [primaryTagId] : []}
              noSelectionString="Select/create tag..."
              hoverPlacement="right"
            />
            {formik.touched.primary_tag_id && (
              <Form.Control.Feedback type="invalid">
                {formik.errors.primary_tag_id}
              </Form.Control.Feedback>
            )}
          </div>
          <div className="col-sm-5 col-md-4 col-xl-12">
            <div className="row">
              <Form.Label className="col-sm-4 col-md-4 col-xl-12 col-form-label text-sm-right text-xl-left">
                Time
              </Form.Label>
              <div className="col-sm-8 col-xl-12">
                <DurationInput
                  value={formik.values.seconds ?? 0}
                  setValue={(v) => formik.setFieldValue("seconds", v ?? null)}
                  onReset={() =>
                    formik.setFieldValue(
                      "seconds",
                      Math.round(getPlayerPosition() ?? 0)
                    )
                  }
                />
              </div>
            </div>
          </div>
        </Form.Group>
        <Form.Group className="row">
          <Form.Label className="col-sm-3 col-md-2 col-xl-12 col-form-label">
            Tags
          </Form.Label>
          <div className="col-sm-9 col-md-10 col-xl-12">
            <TagSelect
              isMulti
              onSelect={(tags) =>
                formik.setFieldValue(
                  "tag_ids",
                  tags.map((tag) => tag.id)
                )
              }
              ids={formik.values.tag_ids}
              noSelectionString="Select/create tags..."
              hoverPlacement="right"
            />
          </div>
        </Form.Group>
      </div>
      <div className="buttons-container row">
        <div className="col d-flex">
          <Button
            variant="primary"
            disabled={!isNew && !formik.dirty}
            onClick={() => formik.submitForm()}
          >
            <FormattedMessage id="actions.save" />
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            className="ml-2"
          >
            <FormattedMessage id="actions.cancel" />
          </Button>
          {!isNew && (
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
    </Form>
  );
};
