import { vscode } from '@/utilities/vscode';
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Button,
  Select,
  Space,
  notification,
  Spin,
  Slider,
  Dropdown,
  Input,
  Tooltip,
  Checkbox,
  Modal,
} from 'antd';
import type { CheckboxProps } from 'antd';
import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons';
import * as d3 from 'd3';
import { timeFormat } from 'd3-time-format';
import { timeMinute } from 'd3-time';
import dayjs from 'dayjs';
import { findClosestLargerStamp, fillMissingDates } from './utils';
import Danmu from './danmu';
import styles from './index.module.css';
import commentSvg from '../../assets/comments.svg';

interface PlayerAllData {
  timeLine: {
    timestamps: number;
    action: string;
    fileName: string;
    comment?: string;
  }[];
  summary: {
    start: string;
    end: string;
    content: string;
  }[];
  workId: string;
}

interface PlayerGroupData {
  date: Date;
  value: number;
  timeStamps: number[];
}

interface LogData {
  time: string;
  action: string;
  fileName: string;
  isChanged: boolean;
}

const ActionMap: any = {
  closeFile: '关闭',
  deleteFile: '删除',
  renameFile: '重命名',
  createFile: '创建',
  activeFile: '查看',
  saveFile: '保存',
  moveFile: '移动',
  addComment: '评论',
  openLink: '浏览',
};

const Player = () => {
  const [api, contextHolder] = notification.useNotification({
    duration: 1,
    top: 8,
  });
  const containerRef = useRef<any>();
  const logWrapperRef = useRef<any>();
  const svgRef = useRef<any>();

  const customExtent = useRef<any>();
  const xScaleRef = useRef<any>();
  const fileName = useRef<string>('');
  const currentStamp = useRef<number>();
  const playRef = useRef<any>(false);
  const logIndex = useRef<number>(0);
  const contextMenuShow = useRef<boolean>(false);
  const commentBox = useRef<any>();
  const danmu = useRef<Danmu | undefined>();
  const aiSummaryMode = useRef<boolean>(false);

  const [options, setOptions] = useState<any[]>([]);
  const [allData, setAllData] = useState<PlayerAllData>({ timeLine: [], workId: '', summary: [] });
  const [selectData, setSelectData] = useState<PlayerGroupData[]>([]);
  const [logData, setLogData] = useState<LogData[]>([]);
  const [speed, setSpeed] = useState<number>(1);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [currentSummary, setCurrentSummary] = useState('');

  const [isPlay, setIsPlay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commentBoxVisible, setCommentBoxVisible] = useState(false);
  const [commentBoxPosition, setCommentBoxPosition] = useState({ x: 0, y: 0 });

  const reset = () => {
    customExtent.current = null;
  };

  const limitArea = (data: PlayerGroupData[], xNum: number) => {
    let x = xNum;
    const xScale = xScaleRef.current;
    let min = xScale(data[0].date);
    let max = xScale(data[data.length - 1].date);
    if (x < min) x = min;
    if (x > max) x = max;

    const isCenterLeft = x < (min + max) / 2;

    return { x, isCenterLeft };
  };

  const handleResize = () => {
    if (selectData?.length) {
      const data = selectData;

      svgRef.current.selectAll('*').remove();

      svgRef.current
        .attr('width', containerRef.current.clientWidth)
        .attr('height', containerRef.current.clientHeight);

      const width = containerRef.current.clientWidth - 50;
      const height = containerRef.current.clientHeight - 30;

      // 时间轴范围
      const firstData = allData.timeLine[0]?.timestamps;
      const lastData = allData.timeLine[allData.timeLine.length - 1]?.timestamps;
      const extent = customExtent.current || [new Date(firstData), new Date(lastData)];

      // x轴比例尺
      const xScale = d3.scaleTime().domain(extent).range([0, width]);
      xScaleRef.current = xScale;

      // y轴比例尺
      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.value) as number])
        .range([height, 0]);

      const area = d3
        .area()
        // @ts-ignore
        .x((d) => xScale(d.date))
        .y0(height)
        // @ts-ignore
        .y1((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);

      // @ts-ignore
      const path = area(data);
      svgRef.current
        .append('path')
        .attr('d', path)
        .attr('fill', 'rgba(70, 130, 180, 1)')
        .attr('style', 'transform: translateX(20px);');

      const initX = xScale(allData.timeLine[0].timestamps);
      const curX = currentStamp.current ? xScale(currentStamp.current) : null;

      const markText = svgRef.current
        .append('text')
        .attr('x', curX || initX)
        .attr('y', 0)
        .attr('dy', '1em')
        .attr('dx', '25px')
        .attr('style', 'fill:var(--crow-color-text);font-size:10px;')
        .text(dayjs(currentStamp.current || new Date(data[0].date)).format('HH:mm:ss'));

      const markLine = svgRef.current
        .append('line')
        .attr('x1', curX || initX)
        .attr('y1', 0)
        .attr('x2', curX || initX)
        .attr('y2', height)
        .attr('stroke', 'red')
        .attr('stroke-width', 1.5)
        .attr('style', 'transform: translateX(20px);')
        .call(
          d3
            .drag()
            .on('drag', function (event) {
              let x = event.x - 20;
              const { x: xNum, isCenterLeft } = limitArea(data, x);
              x = xNum;

              currentStamp.current = dayjs(xScale.invert(x)).valueOf();
              // @ts-ignore
              d3.select(this).attr('x1', x).attr('x2', x);
              markText
                .attr('x', x)
                .attr('dx', isCenterLeft ? '25px' : '-28px')
                .text(dayjs(xScale.invert(x)).format('HH:mm:ss'));
            })
            .on('end', function (event) {
              const x = event.x - 20;
              currentStamp.current = dayjs(xScale.invert(x)).valueOf();
              const stamps = allData.timeLine.map((item: any) => item.timestamps);
              const target = findClosestLargerStamp(stamps, currentStamp.current);

              vscode.postMessage({
                type: 'crowPlayer',
                content: {
                  method: 'jumpForward',
                  params: { fileName: fileName.current, timestamp: target },
                },
              });
            }),
        );

      // const isOver12Hours =
      //   data[data.length - 1].timeStamps[0] - data[0].timeStamps[0] > 12 * 60 * 60 * 1000;

      svgRef.current
        .append('g')
        .attr('style', `transform: translate(20px, ${height}px);`)
        .call(
          d3
            .axisBottom(xScale)
            // @ts-ignore
            .tickFormat(timeFormat('%H:%M'))
            .ticks(timeMinute.every(30)),
        )
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.3em')
        .attr('dy', '.5em')
        .attr('transform', 'rotate(-45)');

      const clickEvent = (x: number) => {
        const { x: xNum, isCenterLeft } = limitArea(data, x);
        x = xNum;

        currentStamp.current = dayjs(xScale.invert(x)).valueOf();
        markLine.attr('x1', x).attr('x2', x);
        markText
          .attr('x', x)
          .attr('dx', isCenterLeft ? '25px' : '-28px')
          .text(dayjs(xScale.invert(x)).format('HH:mm:ss'));

        const stamps = allData.timeLine.map((item: any) => item.timestamps);
        const target = findClosestLargerStamp(stamps, currentStamp.current);

        vscode.postMessage({
          type: 'crowPlayer',
          content: {
            method: 'jumpForward',
            params: { fileName: fileName.current, timestamp: target },
          },
        });
      };

      const commentData = allData.timeLine.filter((item: any) => item.action === 'addComment');
      let preCommentX = 0;
      let preCommentY = 18;
      commentData.forEach((item: any) => {
        const x = xScale(item.timestamps);
        const y = x - preCommentX <= 18 ? preCommentY + 18 : 18;

        preCommentX = x;
        preCommentY = y;

        svgRef.current
          .append('image')
          .attr('href', `${commentSvg}`)
          .attr('x', x)
          .attr('y', y)
          .attr('width', 18)
          .attr('height', 18)
          .style('opacity', '0.3')
          .style('cursor', 'pointer')
          .style('transform', 'translate(10px)')
          .on('mouseover', function () {
            // @ts-ignore
            d3.select(this).style('opacity', '1');
          })
          .on('mouseout', function () {
            // @ts-ignore
            d3.select(this).style('opacity', '0.3');
          })
          .on('click', function (event: any) {
            event.stopPropagation();
            clickEvent(x);
          })
          .append('title')
          .text(item.comment);
      });

      allData.summary.forEach((item: any) => {
        if (!item) return;
        const x = xScale(item.start);
        const width = (xScale(item.end) - x) as number;
        svgRef.current
          .append('rect')
          .attr('x', x)
          .attr('y', height - 4)
          .attr('dx', '20px')
          .attr('width', width)
          .attr('height', 8)
          .attr('opacity', '0.7')
          .style('transform', 'translate(20px)')
          .style('cursor', 'pointer')
          .attr('fill', 'rgb(222, 45, 38)')
          .on('mouseover', function () {
            // @ts-ignore
            d3.select(this).attr('opacity', '1');
          })
          .on('mouseout', function () {
            // @ts-ignore
            d3.select(this).attr('opacity', '0.7');
          })
          .on('click', function (event: any) {
            event.stopPropagation();
            setCurrentSummary(item.content);
          });
      });

      svgRef.current.on('click', function (event: any) {
        if (contextMenuShow.current) return;
        if (commentBoxVisible) {
          setCommentBoxVisible(false);
          return;
        }

        if (playRef.current) {
          api.open({
            message: '请先暂停播放',
          });
          return;
        }

        let x = d3.pointer(event)[0] - 20;
        clickEvent(x);
      });
    }
  };

  const dealD3Data = (res: PlayerAllData, needChangeCurStamp?: boolean) => {
    const datas = res.timeLine
      .filter((t: any) => t.action !== 'addComment')
      .map((t: any) => new Date(t.timestamps));

    if (needChangeCurStamp) {
      currentStamp.current = datas[0].getTime();
    }

    const groupedDateMap = d3.group(datas, (d: any) => Math.ceil(d.getTime() / (60 * 1000)));
    const groupedDate = Array.from(groupedDateMap, ([key, value]) => ({
      date: key,
      value: value.length,
    }));

    const _groupedDate = fillMissingDates(groupedDate);
    const data: PlayerGroupData[] = _groupedDate.map((item: any) => ({
      ...item,
      date: new Date(item.date * 60 * 1000),
    }));

    setSelectData(data);
  };

  const handleMessage = (event: MessageEvent) => {
    const { data = {} } = event || {};
    const { type, content } = data || {};

    if (type === 'crowPlayer') {
      const { method, res, timestamp, comment, status } = content || {};
      if (method === 'generateAISummary') {
        const { summary } = res || {};
        if (!summary.length) {
          api.open({
            message: 'AI总结失败',
          });
          return;
        }

        setSummaryLoading(false);
        setAllData({ ...allData, summary });
        api.open({
          message: 'AI总结完成',
        });
      }
      if (method === 'comment') {
        danmu.current?.send(comment, speed);
        return;
      }
      if (method === 'openLink') {
        const { pageContent, url } = res;
        const content = `打开了${url};页面内容:${pageContent}`;
        danmu.current?.send(content, speed);
      }
      if (method === 'jumpEnd') {
        setLoading(false);
        api.open({
          message: '已快进到时间点',
        });
        return;
      }
      if (method === 'playEnd') {
        setIsPlay(false);
        setLoading(false);
        playRef.current = false;
        api.open({
          message: '播放结束',
        });

        if (aiSummaryMode.current) {
          vscode.postMessage({
            type: 'crowPlayer',
            content: {
              method: 'generateAISummary',
              params: {
                fileName: fileName.current,
              },
            },
          });
          aiSummaryMode.current = false;
        }

        return;
      }
      if (method === 'jumpLoading') {
        setLoading(true);
        return;
      }
      // 回放执行
      if (method === 'playExecute') {
        currentStamp.current = timestamp;
        let curX = xScaleRef.current(timestamp);
        const { x, isCenterLeft } = limitArea(selectData, curX);

        svgRef.current.select('line').transition().duration(200).attr('x1', curX).attr('x2', curX);
        svgRef.current
          .select('text')
          .transition()
          .duration(200)
          .attr('x', curX)
          .attr('dx', isCenterLeft ? '25px' : '-28px')
          .text(dayjs(timestamp).format('HH:mm:ss'));

        let logs: any[] = [];
        let currentIndex = 0;
        allData.timeLine.forEach((item: any, index: number) => {
          if (
            item.timestamps <= timestamp &&
            item.action !== 'openFile' &&
            item.action !== 'editFile'
          ) {
            let fileName = item.fileName;
            if (item.action === 'openLink') {
              const url = new URL(item.url);
              fileName = url.hostname;
            }
            const log = {
              time: dayjs(item.timestamps).format('HH:mm:ss'),
              action: ActionMap[item.action],
              fileName,
              isChanged: index >= logIndex.current,
            };
            logs.push(log);
            currentIndex = index;
          }
        });
        logIndex.current = currentIndex;
        setLogData(logs);
        return;
      }
      if (method === 'getLogFiles') {
        setOptions(res.map((item: string) => ({ label: item, value: item })));
        return;
      }
      if (method === 'getFileInfo') {
        setAllData(res);
        dealD3Data(res, true);
        return;
      }
      if (method === 'updatePlayStatus') {
        playRef.current = !status;
        handlePlayBtnClick();
      }
    }
  };
  // 日志痛点分析
  const handleAnalysis = () => {
    vscode.postMessage({
      type: 'crowPlayer',
      content: {
        method: 'analysis',
        params: {
          fileName: fileName.current,
          timestamp: allData.timeLine[allData.timeLine.length - 1].timestamps,
        },
      },
    });
  };

  // 是否开启跳过空闲时间
  const handleChangeSwitch = () => {
    vscode.postMessage({
      type: 'crowPlayer',
      content: { method: 'jumpIdleTime', params: { fileName: fileName.current, status: true } },
    });
  };

  const handleLogSelect = (value: string) => {
    reset();
    fileName.current = value;
    vscode.postMessage({
      type: 'crowPlayer',
      content: { method: 'getFileInfo', params: { fileName: value } },
    });
  };

  const handleSpeedChange = (value: number) => {
    setSpeed(value);
    // danmu.current?.changeSpeed(value);
    vscode.postMessage({
      type: 'crowPlayer',
      content: { method: 'speedPlay', params: { fileName: fileName.current, speed: value } },
    });
  };

  // 播放
  const handlePlayBtnClick = () => {
    if (!fileName.current) return;
    if (playRef.current) {
      setLoading(false);
      setIsPlay(false);
      playRef.current = false;
      danmu.current?.pause();
      vscode.postMessage({
        type: 'crowPlayer',
        content: { method: 'pause', params: { fileName: fileName.current } },
      });
      return;
    }

    setIsPlay(true);
    playRef.current = true;
    danmu.current?.play();
    vscode.postMessage({
      type: 'crowPlayer',
      content: { method: 'play', params: { fileName: fileName.current, speed: speed } },
    });
  };

  const handleMenuClick = (key: string, domEvent: MouseEvent) => {
    if (key === 'comment') {
      if (playRef.current) {
        handlePlayBtnClick();
      }

      let { clientX, clientY } = domEvent;
      if (containerRef.current.clientWidth - clientX <= 300) {
        clientX -= 300;
      }
      setCommentBoxPosition({ x: clientX, y: clientY });
      setCommentBoxVisible(true);
    }
  };

  const handleSubmitComment = () => {
    const comment = commentBox.current.input.value;
    if (!comment) {
      api.open({
        message: '请输入评论',
      });
      return;
    }

    // TDDO: 提交评论
    const curStamp = currentStamp.current as number;
    const allStamps = allData.timeLine.map((item: any) => item.timestamps);
    const nextStamp = findClosestLargerStamp(allStamps, curStamp);

    const targetIndex = allData.timeLine.findIndex((item: any) => item.timestamps === nextStamp);
    allData.timeLine.splice(targetIndex, 0, {
      action: 'addComment',
      timestamps: curStamp,
      fileName: '',
      comment,
    });

    setAllData({ ...allData });
    setCommentBoxVisible(false);
    vscode.postMessage({
      type: 'crowPlayer',
      content: {
        method: 'addComment',
        params: { fileName: fileName.current, comment, curStamp, nextStamp },
      },
    });

    handlePlayBtnClick();
    danmu.current?.send(comment, speed);
  };

  const handleCheckBoxChange: CheckboxProps['onChange'] = (e) => {
    if (e.target.checked) {
      let _allData = { ...allData };
      _allData.timeLine = _allData.timeLine.filter((item: any) => item.action === 'editFile');
      dealD3Data(_allData);
    } else {
      dealD3Data({ ...allData });
    }
  };

  useEffect(() => {
    vscode.postMessage({
      type: 'crowPlayer',
      content: { method: 'getLogFiles' },
    });
  }, []);

  useEffect(() => {
    if (selectData?.length) {
      if (!svgRef.current) {
        svgRef.current = d3
          .select('#container')
          .append('svg')
          .attr('style', 'user-select:none;')
          .attr('width', containerRef.current.clientWidth)
          .attr('height', containerRef.current.clientHeight);
      }

      if (!danmu.current) {
        danmu.current = new Danmu(document.getElementById('danmu') as HTMLElement);
      }

      let lastWidth = window.innerWidth;
      const _handleResize = () => {
        if (window.innerWidth !== lastWidth) {
          handleResize();
          lastWidth = window.innerWidth;
        }
      };
      handleResize();
      window.addEventListener('resize', _handleResize);
      return () => {
        window.removeEventListener('resize', _handleResize);
      };
    }
  }, [selectData, allData, commentBoxVisible]);

  useEffect(() => {
    if (logWrapperRef.current) {
      logWrapperRef.current.scrollTop = logWrapperRef.current.scrollHeight;
    }
  }, [logData]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [allData, speed]);

  return (
    <div className={styles.wrapper}>
      {contextHolder}
      <div className={styles.player_wrapper}>
        {!!selectData?.length && (
          <>
            <Modal
              open={!!currentSummary}
              title="AI 评论"
              onCancel={() => setCurrentSummary('')}
              footer={null}
              width={'60vw'}
              centered
            >
              <Input.TextArea value={currentSummary} autoSize />
            </Modal>
            <div id="danmu" className={styles.danmu_wrapper}></div>
            {commentBoxVisible && (
              <Space.Compact
                className={styles.comment_box}
                style={{
                  left: commentBoxPosition.x,
                  top: commentBoxPosition.y,
                }}
              >
                <Input
                  ref={commentBox}
                  size="small"
                  placeholder="请输入评论"
                  onPressEnter={handleSubmitComment}
                />
                <Button type="primary" size="small" onClick={handleSubmitComment}>
                  提交
                </Button>
              </Space.Compact>
            )}
            <Spin spinning={loading}>
              <Dropdown
                menu={{
                  items: [
                    {
                      label: '评论',
                      key: 'comment',
                    },
                  ],
                  onClick: ({ key, domEvent }: any) => {
                    handleMenuClick(key, domEvent);
                  },
                }}
                trigger={['contextMenu']}
                onOpenChange={(open) => {
                  contextMenuShow.current = open;
                }}
              >
                <div
                  id="container"
                  style={{
                    height: 200,
                    minHeight: 200,
                    width: '100%',
                    marginBottom: 16,
                  }}
                  ref={containerRef}
                />
              </Dropdown>
            </Spin>
          </>
        )}
        <Space size={12} align="center">
          <Select
            size="small"
            placeholder="选择播放资源"
            options={options}
            disabled={isPlay}
            onChange={handleLogSelect}
            style={{ width: 130 }}
          />
          {!!selectData?.length && (
            <>
              {!allData.summary?.length && (
                <Button
                  size="small"
                  loading={summaryLoading}
                  disabled={isPlay}
                  onClick={() => {
                    aiSummaryMode.current = true;
                    setSummaryLoading(true);
                    vscode.postMessage({
                      type: 'crowPlayer',
                      content: {
                        method: 'jumpForward',
                        params: {
                          fileName: fileName.current,
                          timestamp: allData.timeLine[allData.timeLine.length - 1].timestamps,
                        },
                      },
                    });

                    setTimeout(() => {
                      vscode.postMessage({
                        type: 'crowPlayer',
                        content: {
                          method: 'play',
                          params: { fileName: fileName.current, speed: speed },
                        },
                      });
                    }, 500);
                  }}
                >
                  AI总结
                </Button>
              )}
              <Button size="small" onClick={handleAnalysis}>
                分析
              </Button>
              <Tooltip title="跳过空闲时间">
                <Button size="small" onClick={handleChangeSwitch}>
                  跳过
                </Button>
              </Tooltip>
              <div className={styles.slider_wrapper}>
                <div>倍速:</div>
                <Slider
                  style={{ width: 150, marginLeft: 16, marginRight: 16 }}
                  min={1}
                  max={5}
                  step={0.5}
                  value={speed}
                  tooltip={{ formatter: (value: any) => `${value.toFixed(1)}x` }}
                  onChangeComplete={handleSpeedChange}
                  onChange={(value) => setSpeed(value)}
                />
                <Select
                  size="small"
                  style={{ width: 80 }}
                  value={speed}
                  listHeight={200}
                  options={[
                    { label: '50x', value: 50 },
                    { label: '10x', value: 10 },
                  ]}
                  labelRender={({ label, value }: any) => {
                    if (label) {
                      return label;
                    }
                    return <span>{`${value.toFixed(2)}x`}</span>;
                  }}
                  onChange={handleSpeedChange}
                />
              </div>
              <Checkbox onChange={handleCheckBoxChange}>只看编辑</Checkbox>
              <Button type="primary" shape="circle" size="small" onClick={handlePlayBtnClick}>
                {isPlay ? <PauseOutlined /> : <CaretRightOutlined />}
              </Button>
            </>
          )}
        </Space>
      </div>
      <div className={styles.log_wrapper} ref={logWrapperRef}>
        {logData.map((item: any, index: number) => {
          return (
            <Space key={index} size={4} style={item.isChanged ? { color: 'red' } : {}}>
              <div style={{ width: 50 }}>{item.time}</div>
              <div style={{ width: 25 }}>{item.action}</div>
              <div style={{ width: 125, whiteSpace: 'nowrap' }}>{item.fileName}</div>
            </Space>
          );
        })}
      </div>
    </div>
  );
};

export default Player;
